# Driver Account Creation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Admins can create driver accounts (username + password) directly from the Drivers page, which provisions a Supabase Auth user and a linked `drivers` row atomically.

**Architecture:** The form collects name, phone, role, username, and password. The API route calls the Supabase Admin API (service role key) to create an auth user with a synthetic email `{username}@fleet.local` and email_confirm bypassed, then inserts the `drivers` row with `auth_user_id` set. The login page detects whether the user typed an email or a plain username and appends `@fleet.local` for the latter.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Supabase Auth (Admin API via `@supabase/supabase-js`), Zod, React

---

### Task 1: Add `username` column and make `email` nullable in DB

**Files:**
- Modify: `src/db/schema.ts`
- Run migration via Supabase MCP

**Step 1: Apply the DB migration**

Run this SQL via Supabase MCP (project `tnfbsymscqlauvsqomtf`):
```sql
ALTER TABLE drivers
  ADD COLUMN username varchar(100) UNIQUE,
  ALTER COLUMN email DROP NOT NULL;
```

**Step 2: Update `src/db/schema.ts` to match**

Change the `drivers` table definition:
```ts
// Before:
email: varchar("email", { length: 200 }).unique().notNull(),

// After:
email: varchar("email", { length: 200 }).unique(),
username: varchar("username", { length: 100 }).unique(),
```

**Step 3: Commit**
```bash
git add src/db/schema.ts
git commit -m "feat: add username column to drivers, make email nullable"
```

---

### Task 2: Create Supabase Admin client

**Files:**
- Create: `src/lib/supabase/admin.ts`
- Modify: `.env.local` (add `SUPABASE_SERVICE_ROLE_KEY`)

**Step 1: Add service role key to `.env.local`**

Add this line (get value from Supabase dashboard → Project Settings → API → service_role key):
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Step 2: Create `src/lib/supabase/admin.ts`**

```ts
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

**Step 3: Commit**
```bash
git add src/lib/supabase/admin.ts
git commit -m "feat: add supabase admin client"
```

---

### Task 3: Update `/api/drivers` POST to provision auth user

**Files:**
- Modify: `src/app/api/drivers/route.ts`

**Step 1: Rewrite the POST handler**

Replace the existing POST in `src/app/api/drivers/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { drivers, activityLog } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// For drivers: username required, email optional
// For admins: email required, username optional
const createDriverSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(2).max(50).regex(/^[a-zA-Z0-9_.-]+$/, "Username may only contain letters, numbers, _, ., -").optional(),
  email: z.string().email().optional(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(["admin", "driver"]).default("driver"),
}).refine(
  (d) => d.role === "admin" ? !!d.email : !!d.username,
  { message: "Admin requires email; driver requires username" }
);

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const allDrivers = await db.select().from(drivers).orderBy(desc(drivers.createdAt));
    return NextResponse.json(allDrivers);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createDriverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, username, email, password, phone, role } = parsed.data;
    // Admins log in with their real email; drivers log in with username@fleet.local
    const authEmail = role === "admin" ? email! : `${username}@fleet.local`;

    // 1. Create Supabase auth user
    const supabaseAdmin = createAdminClient();
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
    });

    if (authError) {
      const isDuplicate = authError.message.toLowerCase().includes("already");
      return NextResponse.json(
        { error: isDuplicate ? "Användarnamnet eller e-posten är redan tagen" : authError.message },
        { status: isDuplicate ? 409 : 500 }
      );
    }

    // 2. Insert drivers row
    let driver;
    try {
      [driver] = await db
        .insert(drivers)
        .values({ name, username: username ?? null, email: email ?? null, phone: phone || null, role, authUserId: authData.user.id })
        .returning();
    } catch (dbError) {
      // Rollback: delete auth user if drivers insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw dbError;
    }

    // 3. Log activity
    await db.insert(activityLog).values({
      entityType: "driver",
      entityId: driver.id,
      action: "created",
      changes: { name, username, email, role },
      performedBy: user.id,
    });

    return NextResponse.json(driver, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Commit**
```bash
git add src/app/api/drivers/route.ts
git commit -m "feat: provision supabase auth user when creating driver"
```

---

### Task 4: Update the driver creation dialog

**Files:**
- Modify: `src/components/drivers/driver-list.tsx`

**Step 1: Replace the form state and fields**

In `driver-list.tsx`, replace the state declarations and form body.

Replace state: keep `email`, add `username` and `password`, remove nothing:
```ts
const [username, setUsername] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
```

Update `handleCreate` body:
```ts
body: JSON.stringify({ name, username: username || undefined, email: email || undefined, password, phone: phone || undefined, role }),
```

Reset block after success — add:
```ts
setUsername("");
setEmail("");
setPassword("");
```

Replace the email field in the form with these fields (username required for driver, email required for admin, email always optional):
```tsx
{/* Username — required for drivers, hidden for admins */}
{role === "driver" && (
  <div className="space-y-2">
    <Label>Användarnamn *</Label>
    <Input
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      required
      placeholder="anna.andersson"
      autoComplete="off"
    />
    <p className="text-[11px] text-gray-400">Används för inloggning. Endast bokstäver, siffror, _, ., -</p>
  </div>
)}

{/* Email — required for admins, optional for drivers */}
<div className="space-y-2">
  <Label>E-post {role === "admin" ? "*" : "(valfritt)"}</Label>
  <Input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    required={role === "admin"}
    placeholder="anna@example.se"
  />
</div>

<div className="space-y-2">
  <Label>Lösenord *</Label>
  <Input
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    required
    placeholder="Minst 6 tecken"
    autoComplete="new-password"
  />
</div>
```

Update the table column header and cell — show username if present, else email:
```tsx
// TableHead: "Användarnamn / E-post"
// TableCell: driver.username ? driver.username : (driver.email || "—")
```

**Step 2: Commit**
```bash
git add src/components/drivers/driver-list.tsx
git commit -m "feat: update driver form to use username/password instead of email"
```

---

### Task 5: Update login page to support username login

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

**Step 1: Update the login handler and field label**

In `login/page.tsx`:

1. Change state: `email` → `identifier`
2. In `handleLogin`, resolve the Supabase email before signing in:
```ts
const [identifier, setIdentifier] = useState("");

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  // Support both email login (admin) and username login (drivers)
  const email = identifier.includes("@") ? identifier : `${identifier}@fleet.local`;

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setError("Felaktigt användarnamn/e-post eller lösenord");
    setLoading(false);
    return;
  }

  router.push("/dashboard");
  router.refresh();
};
```

3. Update the input field:
```tsx
<Label htmlFor="identifier">Användarnamn eller e-post</Label>
<Input
  id="identifier"
  type="text"
  placeholder="användarnamn eller din@email.se"
  value={identifier}
  onChange={(e) => setIdentifier(e.target.value)}
  required
  autoFocus
/>
```

**Step 2: Commit**
```bash
git add src/app/(auth)/login/page.tsx
git commit -m "feat: login page supports username or email"
```

---

### Task 6: Manual smoke test

1. Go to `/drivers`
2. Click "Lägg till" — verify form shows Namn, Användarnamn, Lösenord, Telefon, Roll
3. Create a driver with username `testforare` and password `test123`
4. Verify row appears in the drivers table
5. Log out
6. Log in with `testforare` / `test123` — verify dashboard loads as a driver
7. Log back in as admin (with email) — verify it still works
