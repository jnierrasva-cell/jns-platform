import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";
import { fetchWithRetry } from "@/lib/http/retry";

type GoogleConnection = {
  organization_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  connected_email: string | null;
  needs_reauth?: boolean | null;
};

async function markNeedsReauth(
  organizationId: string,
  message: string,
) {
  const supabase = createAdminClient();
  await supabase
    .from("connections")
    .update({
      needs_reauth: true,
      last_auth_error: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("provider", "google");
}

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
      "organization_id, access_token, refresh_token, expires_at, connected_email, needs_reauth",
    )
    .eq("organization_id", organizationId)
    .eq("provider", "google")
    .maybeSingle();

  if (error || !connection) {
    throw new Error("Google is not connected for this organization");
  }

  const conn = connection as GoogleConnection;

  if (conn.needs_reauth) {
    throw new Error(
      "Google needs to be reconnected for this workspace (token revoked or expired). Open Integrations and connect Google again.",
    );
  }

  let accessTokenPlain: string;
  let refreshTokenPlain: string | null;
  try {
    accessTokenPlain = decryptSecret(conn.access_token) ?? "";
    refreshTokenPlain = decryptSecret(conn.refresh_token);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to decrypt Google tokens";
    throw new Error(msg);
  }

  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
  const isExpiredOrClose = Date.now() >= expiresAt - 60_000; // refresh 1 min early

  if (!isExpiredOrClose && accessTokenPlain) {
    return {
      accessToken: accessTokenPlain,
      connectedEmail: conn.connected_email,
    };
  }

  if (!refreshTokenPlain) {
    await markNeedsReauth(
      organizationId,
      "Google access token expired and no refresh token is stored",
    );
    throw new Error(
      "Google access token expired and no refresh token is stored. Reconnect Google.",
    );
  }

  const tokenRes = await fetchWithRetry(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshTokenPlain,
        grant_type: "refresh_token",
      }),
    },
    { label: "google-token-refresh", maxAttempts: 3 },
  );

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    const lower = body.toLowerCase();
    const permanent =
      lower.includes("invalid_grant") ||
      lower.includes("revoked") ||
      lower.includes("invalid_token");

    if (permanent) {
      await markNeedsReauth(
        organizationId,
        `Failed to refresh Google token: ${body.slice(0, 300)}`,
      );
    }

    throw new Error(`Failed to refresh Google token: ${body.slice(0, 300)}`);
  }

  const tokens = await tokenRes.json();
  const newAccessToken = tokens.access_token as string;
  const expiresIn = (tokens.expires_in as number) ?? 3600;
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Google may rotate refresh tokens — persist if present
  const newRefresh =
    typeof tokens.refresh_token === "string" && tokens.refresh_token
      ? tokens.refresh_token
      : refreshTokenPlain;

  const { error: updateError } = await supabase
    .from("connections")
    .update({
      access_token: encryptSecret(newAccessToken),
      refresh_token: encryptSecret(newRefresh),
      expires_at: newExpiresAt,
      needs_reauth: false,
      last_auth_error: null,
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
