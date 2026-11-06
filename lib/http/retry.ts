/**
 * Shared fetch with retries for Arketa + Google APIs.
 * Retries on 429, 408, and 5xx. Honors Retry-After when present.
 */

export type RetryOptions = {
  /** Max attempts including the first try. Default 4. */
  maxAttempts?: number;
  /** Base delay in ms before first retry. Default 400. */
  baseDelayMs?: number;
  /** Max delay cap in ms. Default 8000. */
  maxDelayMs?: number;
  /** Optional label for logs. */
  label?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function parseRetryAfterMs(res: Response): number | null {
  const raw = res.headers.get("retry-after");
  if (!raw) return null;
  const asInt = Number(raw);
  if (Number.isFinite(asInt) && asInt >= 0) {
    // seconds
    return Math.min(asInt * 1000, 30_000);
  }
  const asDate = Date.parse(raw);
  if (!Number.isNaN(asDate)) {
    return Math.min(Math.max(asDate - Date.now(), 0), 30_000);
  }
  return null;
}

function jitter(ms: number) {
  const spread = ms * 0.25;
  return Math.max(0, Math.round(ms + (Math.random() * 2 - 1) * spread));
}

export async function fetchWithRetry(
  input: string | URL,
  init?: RequestInit,
  options?: RetryOptions,
): Promise<Response> {
  const maxAttempts = options?.maxAttempts ?? 4;
  const baseDelayMs = options?.baseDelayMs ?? 400;
  const maxDelayMs = options?.maxDelayMs ?? 8000;
  const label = options?.label ?? "http";

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(input, init);

      if (res.ok || !isRetryableStatus(res.status) || attempt === maxAttempts) {
        return res;
      }

      const retryAfter = parseRetryAfterMs(res);
      const backoff = Math.min(
        maxDelayMs,
        baseDelayMs * 2 ** (attempt - 1),
      );
      const delay = retryAfter ?? jitter(backoff);

      console.warn(
        `[${label}] retryable ${res.status} attempt ${attempt}/${maxAttempts}, wait ${delay}ms`,
      );
      await sleep(delay);
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) break;

      const backoff = Math.min(
        maxDelayMs,
        baseDelayMs * 2 ** (attempt - 1),
      );
      const delay = jitter(backoff);
      console.warn(
        `[${label}] network error attempt ${attempt}/${maxAttempts}, wait ${delay}ms`,
        err instanceof Error ? err.message : err,
      );
      await sleep(delay);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`[${label}] request failed after ${maxAttempts} attempts`);
}
