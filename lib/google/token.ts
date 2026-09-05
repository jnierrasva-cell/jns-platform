import { createAdminClient } from "@/lib/supabase/admin";

type GoogleConnection = {
  organization_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  connected_email: string | null;
};

/**
 * Returns a valid access token for the org's Google connection.
 * Refreshes and saves a new token if the current one is expired/near expiry.
 */
export async function getValidGoogleAccessToken(
  organizationId: string,
): Promise<{ accessToken: string; connectedEmail: string | null }> {
  const supabase = createAdminClient();

  const { data: connection, error } = await supabase
    .from("connections")
    .select(
      "organization_id, access_token, refresh_token, expires_at, connected_email",
    )
    .eq("organization_id", organizationId)
    .eq("provider", "google")
    .maybeSingle();

  if (error || !connection) {
    throw new Error("Google is not connected for this organization");
  }

  const conn = connection as GoogleConnection;
  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
  const isExpiredOrClose = Date.now() >= expiresAt - 60_000; // refresh 1 min early

  if (!isExpiredOrClose && conn.access_token) {
    return {
      accessToken: conn.access_token,
      connectedEmail: conn.connected_email,
    };
  }

  if (!conn.refresh_token) {
    throw new Error(
      "Google access token expired and no refresh token is stored. Reconnect Google.",
    );
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`Failed to refresh Google token: ${body}`);
  }

  const tokens = await tokenRes.json();
  const newAccessToken = tokens.access_token as string;
  const expiresIn = (tokens.expires_in as number) ?? 3600;
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { error: updateError } = await supabase
    .from("connections")
    .update({
      access_token: newAccessToken,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("provider", "google");

  if (updateError) {
    throw new Error(`Failed to save refreshed token: ${updateError.message}`);
  }

  return {
    accessToken: newAccessToken,
    connectedEmail: conn.connected_email,
  };
}