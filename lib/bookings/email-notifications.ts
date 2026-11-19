import { createAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/email/resend";
import { isAutomationEnabled } from "@/lib/workflows/automation-enabled";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export async function sendBookingConfirmationEmail(input: {
  organizationId: string;
  bookingId: string;
  title: string;
  startsAt: string;
  contactEmail?: string | null;
  contactFirstName?: string | null;
  contactId?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const admin = createAdminClient();

  const enabled = await isAutomationEnabled(
    input.organizationId,
    "booking-email-reminders",
  );

  // Missing org_automations row historically meant allow; dual-read:
  // if neither org_automations nor workflow is on, check org_automations absence
  const { data: automation } = await admin
    .from("org_automations")
    .select("is_enabled")
    .eq("organization_id", input.organizationId)
    .eq("service_key", "booking-email-reminders")
    .maybeSingle();

  if (automation && automation.is_enabled === false && !enabled) {
    return { sent: false, reason: "automation_disabled" };
  }
  if (automation && automation.is_enabled === false) {
    return { sent: false, reason: "automation_disabled" };
  }

  const { data: settingsRow } = await admin
    .from("org_automation_settings")
    .select("settings")
    .eq("organization_id", input.organizationId)
    .eq("service_key", "booking-email-reminders")
    .maybeSingle();

  const settings = (settingsRow?.settings ?? {}) as {
    send_confirmation?: boolean;
  };
  if (settings.send_confirmation === false) {
    return { sent: false, reason: "confirmation_disabled" };
  }

  const email = input.contactEmail?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { sent: false, reason: "no_email" };
  }

  const { data: booking } = await admin
    .from("bookings")
    .select("confirmation_email_sent_at")
    .eq("id", input.bookingId)
    .maybeSingle();

  if (booking?.confirmation_email_sent_at) {
    return { sent: false, reason: "already_sent" };
  }

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", input.organizationId)
    .maybeSingle();

  const businessName = org?.name?.trim() || "Us";
  const firstName = input.contactFirstName?.trim() || "there";
  const when = formatWhen(input.startsAt);

  const subject = `Confirmed: ${input.title} — ${when}`;
  const text = [
    `Hi ${firstName},`,
    "",
    `Your booking is confirmed.`,
    "",
    `What: ${input.title}`,
    `When: ${when}`,
    "",
    `If you need to reschedule, reply to this email or contact ${businessName}.`,
    "",
    `— ${businessName}`,
  ].join("\n");

  const result = await sendResendEmail({
    to: [email],
    subject,
    text,
  });

  if (!result.ok) {
    console.error("[sendBookingConfirmationEmail]", result.error);
    return { sent: false, reason: result.error };
  }

  await admin
    .from("bookings")
    .update({
      confirmation_email_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.bookingId);

  try {
    await admin.from("email_activity").insert({
      organization_id: input.organizationId,
      contact_id: input.contactId ?? null,
      service_key: "booking-email-reminders",
      direction: "outbound",
      to_email: email,
      subject,
      status: "sent",
    });
  } catch {
    // activity table optional shape
  }

  return { sent: true };
}

export async function sendBookingReminderEmail(input: {
  organizationId: string;
  bookingId: string;
  title: string;
  startsAt: string;
  contactEmail: string;
  contactFirstName?: string | null;
  contactId?: string | null;
  businessName?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const admin = createAdminClient();
  const email = input.contactEmail.trim().toLowerCase();
  if (!email.includes("@")) return { sent: false, reason: "no_email" };

  const firstName = input.contactFirstName?.trim() || "there";
  const when = formatWhen(input.startsAt);
  const businessName = input.businessName?.trim() || "Us";

  const subject = `Reminder: ${input.title} — ${when}`;
  const text = [
    `Hi ${firstName},`,
    "",
    `This is a reminder for your upcoming booking.`,
    "",
    `What: ${input.title}`,
    `When: ${when}`,
    "",
    `Reply if you need to reschedule.`,
    "",
    `— ${businessName}`,
  ].join("\n");

  const result = await sendResendEmail({
    to: [email],
    subject,
    text,
  });

  if (!result.ok) {
    return { sent: false, reason: result.error };
  }

  await admin
    .from("bookings")
    .update({
      reminder_email_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.bookingId);

  try {
    await admin.from("email_activity").insert({
      organization_id: input.organizationId,
      contact_id: input.contactId ?? null,
      service_key: "booking-email-reminders",
      direction: "outbound",
      to_email: email,
      subject,
      status: "sent",
    });
  } catch {
    // ignore
  }

  return { sent: true };
}
