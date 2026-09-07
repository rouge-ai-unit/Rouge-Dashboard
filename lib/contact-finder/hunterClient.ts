// ============================================================================
// CONTACT FINDER — HUNTER.IO CLIENT
// Thin wrapper over the Hunter.io v2 API. Mirrors the reference Streamlit app
// (github.com/parapinich/contact-finder-using-hunter.io): Email Finder for
// name lookups, Domain Search + client-side job-title filter for role lookups,
// plus an Email Verifier step.
// Docs: https://hunter.io/api-documentation/v2
// ============================================================================

const HUNTER_BASE_URL = 'https://api.hunter.io/v2';
const REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_DOMAIN_SEARCH_LIMIT = 100;

// --- Response shapes (only the fields we read) -------------------------------

export interface HunterSource {
  uri?: string;
  domain?: string;
}

export interface HunterEmailFinderData {
  email?: string | null;
  score?: number | null;
  position?: string | null;
  company?: string | null;
  domain?: string | null;
  sources?: HunterSource[] | null;
}

export interface HunterDomainEmail {
  value?: string | null;
  confidence?: number | null;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
  department?: string | null;
  seniority?: string | null;
  sources?: HunterSource[] | null;
}

export interface HunterDomainSearchData {
  domain?: string | null;
  organization?: string | null;
  emails: HunterDomainEmail[];
}

export interface HunterVerificationResult {
  status: string | null;
  score: number | null;
}

// --- Core request -----------------------------------------------------------

function getApiKey(): string {
  const key = process.env.HUNTER_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'HUNTER_API_KEY is not configured. Add it to .env.local (local) or the deployment env.'
    );
  }
  return key;
}

/**
 * GET {HUNTER_BASE_URL}/{endpoint} with the api_key injected and a hard timeout.
 * Maps Hunter's documented error statuses to Error messages the route layer
 * pattern-matches on. Ported from `call_hunter` in the reference app.py.
 */
async function callHunter(
  endpoint: string,
  params: Record<string, string>
): Promise<any> {
  const query = new URLSearchParams({ ...params, api_key: getApiKey() });

  let resp: Response;
  try {
    resp = await fetch(`${HUNTER_BASE_URL}/${endpoint}?${query.toString()}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error('Request to Hunter.io timed out. Please try again.');
    }
    throw new Error(`Failed to reach Hunter.io: ${err instanceof Error ? err.message : err}`);
  }

  if (resp.status === 401) {
    throw new Error('Invalid Hunter.io API key. Double-check your HUNTER_API_KEY.');
  }
  if (resp.status === 429) {
    throw new Error('Hunter.io request limit reached (rate limit / monthly quota).');
  }
  if (resp.status === 400) {
    let detail = '';
    try {
      const body = await resp.json();
      detail = body?.errors?.[0]?.details ?? '';
    } catch {
      /* ignore */
    }
    throw new Error(`Invalid request. ${detail || 'Check the company/domain you entered.'}`);
  }
  if (!resp.ok) {
    throw new Error(`Hunter.io returned an error (${resp.status}).`);
  }

  try {
    return await resp.json();
  } catch {
    throw new Error('Could not parse the response from Hunter.io.');
  }
}

// --- Helpers ---------------------------------------------------------------

/**
 * If the input looks like a domain (has a "." and no spaces) send it as the
 * `domain` param; otherwise send it as `company` and let Hunter resolve it.
 */
export function detectDomainOrCompany(
  text: string
): { field: 'domain' | 'company'; value: string } {
  const trimmed = text.trim();
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return { field: 'domain', value: trimmed.toLowerCase() };
  }
  return { field: 'company', value: trimmed };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Keep only emails whose `position` contains the job title (case-insensitive). */
export function filterByJobTitle<T extends { position?: string | null }>(
  emails: T[],
  jobTitle: string
): T[] {
  const pattern = new RegExp(escapeRegExp(jobTitle.trim()), 'i');
  return emails.filter((e) => e.position && pattern.test(e.position));
}

// --- Endpoints ------------------------------------------------------------

export async function emailFinder(opts: {
  fullName: string;
  company: string;
}): Promise<HunterEmailFinderData> {
  const { field, value } = detectDomainOrCompany(opts.company);
  const json = await callHunter('email-finder', {
    full_name: opts.fullName.trim(),
    [field]: value,
  });
  return json?.data ?? {};
}

/**
 * Domain Search with `limit=100`. If the account plan caps results per request
 * ("The search results are limited to N email addresses on your current plan"),
 * retry once with that N. Ported from `domain_search_with_plan_limit`.
 */
export async function domainSearch(opts: {
  company: string;
}): Promise<HunterDomainSearchData> {
  const { field, value } = detectDomainOrCompany(opts.company);
  const params: Record<string, string> = {
    [field]: value,
    limit: String(DEFAULT_DOMAIN_SEARCH_LIMIT),
  };

  try {
    const json = await callHunter('domain-search', params);
    return { emails: [], ...(json?.data ?? {}) };
  } catch (err) {
    const match =
      err instanceof Error ? /limited to (\d+) email addresses/.exec(err.message) : null;
    if (!match) throw err;
    const json = await callHunter('domain-search', { ...params, limit: match[1] });
    return { emails: [], ...(json?.data ?? {}) };
  }
}

/** Best-effort verification — never throws; returns null if Hunter errors out. */
export async function verifyEmail(email: string): Promise<HunterVerificationResult | null> {
  try {
    const json = await callHunter('email-verifier', { email });
    const data = json?.data ?? {};
    return { status: data.status ?? null, score: data.score ?? null };
  } catch {
    return null;
  }
}
