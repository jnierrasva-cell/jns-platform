import { createAdminClient } from "@/lib/supabase/admin";

type SendSmsInput = {
  organizationId: string;
  toPhone: string;
  body: string;
  contactId?: string;
};

/**
 * Sends an SMS using the org's connected Twilio account.
 * Logs the result to sms_activity.
 */
export async function sendSms(input: SendSmsInput) {
  const supabase = createAdminClient();

  const { data: twilio, error: twilioError } = await supabase
    .from("twilio_connections")
    .select("account_sid, auth_token, from_number, is_valid")
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (twilioError || !twilio) {
    throw new Error("Twilio is not connected for this organization");
  }

  if (!twilio.is_valid) {
    throw new Error("Twilio connection is marked invalid. Reconnect Twilio.");
  }

  const toPhone = input.toPhone.trim();
  const body = input.body.trim();

  if (!toPhone || !body) {
    throw new Error("Phone number and message body are required");
  }

  const auth = Buffer.from(
    `${twilio.account_sid}:${twilio.auth_token}`,
  ).toString("base64");

  const params = new URLSearchParams({
    To: toPhone,
    From: twilio.from_number,
    Body: body,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilio.account_sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    await supabase.from("sms_activity").insert({
      organization_id: input.organizationId,
      contact_id: input.contactId ?? null,
      to_phone: toPhone,
      body,
      status: "failed",
      provider: "twilio",
      error_message: data?.message ?? JSON.stringify(data),
    });

    throw new Error(data?.message ?? "Twilio send failed");
  }

  await supabase.from("sms_activity").insert({
    organization_id: input.organizationId,
    contact_id: input.contactId ?? null,
    to_phone: toPhone,
    body,
    status: "sent",
    provider: "twilio",
    provider_message_id: data.sid ?? null,
  });

  return {
    sid: data.sid as string,
    status: data.status as string,
  };
}