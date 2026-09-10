/**
 * OAuth2 client-credentials token exchange for the Copernicus Data Space
 * Ecosystem (Sentinel Hub Statistical API) — P9 NDVI adapter.
 *
 * https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token
 * confirmed live via a real curl this session: real client_id/client_secret
 * exchange for a Bearer token, ~30 minute expiry. Cached in-process and
 * refreshed shortly before expiry so a normal request never pays the
 * token round-trip.
 */

const TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const FETCH_TIMEOUT_MS = 8_000;
// Refresh a bit early so an in-flight request never gets a token that
// expires mid-call.
const EXPIRY_SAFETY_MARGIN_MS = 30_000;

export class SentinelAuthError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "SentinelAuthError";
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function fetchToken(): Promise<{ value: string; expiresAt: number }> {
  const clientId = process.env.SENTINEL_CLIENT_ID?.trim();
  const clientSecret = process.env.SENTINEL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new SentinelAuthError("SENTINEL_CLIENT_ID / SENTINEL_CLIENT_SECRET are not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new SentinelAuthError(`Sentinel auth request timed out after ${FETCH_TIMEOUT_MS}ms`, err);
    }
    throw new SentinelAuthError(`Sentinel auth request failed: ${err?.message ?? err}`, err);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {
      // best-effort
    }
    throw new SentinelAuthError(`Sentinel auth returned ${response.status}: ${body || response.statusText}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    throw new SentinelAuthError("Sentinel auth response was not valid JSON", err);
  }

  const accessToken = (json as any)?.access_token;
  const expiresIn = Number((json as any)?.expires_in);
  if (typeof accessToken !== "string" || !accessToken || !Number.isFinite(expiresIn)) {
    throw new SentinelAuthError("Sentinel auth response missing expected access_token/expires_in");
  }

  return { value: accessToken, expiresAt: Date.now() + expiresIn * 1000 };
}

/** Returns a valid Bearer token, reusing the cached one until it's near expiry. */
export async function getSentinelToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - EXPIRY_SAFETY_MARGIN_MS > Date.now()) {
    return cachedToken.value;
  }
  cachedToken = await fetchToken();
  return cachedToken.value;
}

export function isSentinelConfigured(): boolean {
  return Boolean(process.env.SENTINEL_CLIENT_ID?.trim() && process.env.SENTINEL_CLIENT_SECRET?.trim());
}

/** Test-only: clears the cached token so a test doesn't leak state into another. */
export function _resetSentinelTokenCache(): void {
  cachedToken = null;
}
