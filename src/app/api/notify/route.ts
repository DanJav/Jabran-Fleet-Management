import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles, serviceEvents, inspections, settings } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { calculateServiceA, calculateServiceB, daysUntil, getDateStatus } from "@/lib/utils";
import { Resend } from "resend";

export async function GET(req: NextRequest) {
  // Auth: either CRON_SECRET or admin session
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Try admin auth as fallback
    try {
      const { requireAdmin } = await import("@/lib/auth");
      await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Check settings
  const [config] = await db.select().from(settings).limit(1);
  if (!config || !config.notifyEmailEnabled || !config.notifyEmail) {
    return NextResponse.json({ message: "E-postnotifieringar är avaktiverade" });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY saknas" }, { status: 500 });
  }

  // Fetch fleet data
  const allVehicles = await db.select().from(vehicles).where(eq(vehicles.isActive, true));
  const vehicleIds = allVehicles.map((v) => v.id);

  if (vehicleIds.length === 0) {
    return NextResponse.json({ message: "Inga aktiva fordon" });
  }

  const [allServices, allInspections] = await Promise.all([
    db.select().from(serviceEvents).where(inArray(serviceEvents.vehicleId, vehicleIds)).orderBy(desc(serviceEvents.mileageAtService)),
    db.select().from(inspections).where(inArray(inspections.vehicleId, vehicleIds)).orderBy(desc(inspections.date)),
  ]);

  // Index
  const serviceAByVehicle = new Map<string, number>();
  const serviceBByVehicle = new Map<string, number>();
  for (const s of allServices) {
    if (s.serviceType === "A" && !serviceAByVehicle.has(s.vehicleId)) serviceAByVehicle.set(s.vehicleId, s.mileageAtService);
    if (s.serviceType === "B" && !serviceBByVehicle.has(s.vehicleId)) serviceBByVehicle.set(s.vehicleId, s.mileageAtService);
  }

  const besiktningByVehicle = new Map<string, string>();
  const taxameterByVehicle = new Map<string, string>();
  for (const i of allInspections) {
    if (i.inspectionType === "besiktning" && !besiktningByVehicle.has(i.vehicleId)) besiktningByVehicle.set(i.vehicleId, i.nextDueDate);
    if (i.inspectionType === "taxameter" && !taxameterByVehicle.has(i.vehicleId)) taxameterByVehicle.set(i.vehicleId, i.nextDueDate);
  }

  // Build alerts
  type Alert = { reg: string; item: string; value: string; severity: "overdue" | "warning" };
  const alerts: Alert[] = [];

  for (const v of allVehicles) {
    const serviceA = calculateServiceA(v.currentMileage, serviceAByVehicle.get(v.id) ?? null);
    const serviceB = calculateServiceB(v.currentMileage, serviceBByVehicle.get(v.id) ?? null);

    if (serviceA.status === "overdue") alerts.push({ reg: v.registrationNumber, item: "Service A", value: "Försenad", severity: "overdue" });
    else if (serviceA.status === "due_soon") alerts.push({ reg: v.registrationNumber, item: "Service A", value: `${serviceA.km_remaining.toLocaleString("sv-SE")} km kvar`, severity: "warning" });

    if (serviceB.status === "overdue") alerts.push({ reg: v.registrationNumber, item: "Service B", value: "Försenad", severity: "overdue" });
    else if (serviceB.status === "due_soon") alerts.push({ reg: v.registrationNumber, item: "Service B", value: `${serviceB.km_remaining.toLocaleString("sv-SE")} km kvar`, severity: "warning" });

    const besiktningNext = besiktningByVehicle.get(v.id);
    if (besiktningNext) {
      const days = daysUntil(besiktningNext);
      const status = getDateStatus(days);
      if (status === "overdue") alerts.push({ reg: v.registrationNumber, item: "Besiktning", value: "Försenad", severity: "overdue" });
      else if (status === "due_soon") alerts.push({ reg: v.registrationNumber, item: "Besiktning", value: `${days} dagar kvar`, severity: "warning" });
    }

    const taxameterNext = taxameterByVehicle.get(v.id);
    if (taxameterNext) {
      const days = daysUntil(taxameterNext);
      const status = getDateStatus(days);
      if (status === "overdue") alerts.push({ reg: v.registrationNumber, item: "Taxameter", value: "Försenad", severity: "overdue" });
      else if (status === "due_soon") alerts.push({ reg: v.registrationNumber, item: "Taxameter", value: `${days} dagar kvar`, severity: "warning" });
    }
  }

  if (alerts.length === 0) {
    return NextResponse.json({ message: "Inga varningar att skicka" });
  }

  // Sort: overdue first
  alerts.sort((a, b) => (a.severity === "overdue" ? -1 : 1) - (b.severity === "overdue" ? -1 : 1));

  const overdueAlerts = alerts.filter((a) => a.severity === "overdue");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");

  // Build HTML email
  const today = new Date().toISOString().split("T")[0];
  const companyName = config.companyName || "TaxiFleet";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #202020;">
  <h2 style="font-size: 18px; margin-bottom: 4px;">${companyName} — Fordonsrapport</h2>
  <p style="color: #646464; font-size: 13px; margin-top: 0;">${today} · ${allVehicles.length} aktiva fordon · ${alerts.length} varningar</p>

  ${overdueAlerts.length > 0 ? `
  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <h3 style="color: #dc2626; font-size: 14px; margin: 0 0 8px 0;">Försenade (${overdueAlerts.length})</h3>
    <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
      ${overdueAlerts.map((a) => `<tr><td style="padding: 4px 0; font-weight: 600;">${a.reg}</td><td style="padding: 4px 8px;">${a.item}</td><td style="padding: 4px 0; color: #dc2626;">${a.value}</td></tr>`).join("")}
    </table>
  </div>` : ""}

  ${warningAlerts.length > 0 ? `
  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <h3 style="color: #d97706; font-size: 14px; margin: 0 0 8px 0;">Behöver åtgärd (${warningAlerts.length})</h3>
    <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
      ${warningAlerts.map((a) => `<tr><td style="padding: 4px 0; font-weight: 600;">${a.reg}</td><td style="padding: 4px 8px;">${a.item}</td><td style="padding: 4px 0; color: #d97706;">${a.value}</td></tr>`).join("")}
    </table>
  </div>` : ""}

  <p style="color: #8d8d8d; font-size: 11px; margin-top: 24px;">Skickat från ${companyName} via TaxiFleet</p>
</body>
</html>`;

  // Send email
  const resend = new Resend(resendApiKey);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "TaxiFleet <noreply@resend.dev>",
    to: config.notifyEmail,
    subject: `${companyName}: ${overdueAlerts.length > 0 ? `${overdueAlerts.length} försenade` : `${warningAlerts.length} varningar`} — ${today}`,
    html,
  });

  if (error) {
    return NextResponse.json({ error: "E-post kunde inte skickas", details: error }, { status: 500 });
  }

  return NextResponse.json({
    message: "E-post skickad",
    to: config.notifyEmail,
    alerts: alerts.length,
  });
}
