import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { drivers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Look up driver record for this auth user
  const [driver] = await db
    .select()
    .from(drivers)
    .where(eq(drivers.authUserId, user.id))
    .limit(1);

  if (!driver || !driver.isActive) return null;

  return driver;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }
  return user;
}
