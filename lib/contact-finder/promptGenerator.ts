// ============================================================================
// CONTACT FINDER — PROMPT GENERATOR
// Builds optimized search prompts for the Perplexity AI API
// ============================================================================

/**
 * Country-specific government business registries.
 * These are public registries that may contain director/officer information.
 */
const COUNTRY_REGISTRIES: Record<string, string> = {
  'indonesia': 'AHU (ahu.go.id) — Indonesian Ministry of Law business registry',
  'singapore': 'ACRA (acra.gov.sg) — Singapore business registry',
  'malaysia': 'SSM (ssm.com.my) — Malaysian Companies Commission',
  'hong kong': 'CR (cr.gov.hk) — Hong Kong Companies Registry',
  'thailand': 'DBD (dbd.go.th) — Thai Department of Business Development',
  'vietnam': 'National Business Registration Portal (dangkykinhdoanh.gov.vn)',
  'philippines': 'SEC (sec.gov.ph) — Philippine Securities and Exchange Commission',
  'india': 'MCA (mca.gov.in) — Indian Ministry of Corporate Affairs',
  'australia': 'ASIC (asic.gov.au) — Australian Securities & Investments Commission',
  'united states': 'SEC EDGAR (sec.gov) — U.S. Securities and Exchange Commission',
  'united kingdom': 'Companies House (companieshouse.gov.uk) — UK company registry',
  'japan': 'National Tax Agency corporate registry',
};

/**
 * Roles that should trigger GitHub search (tech-related positions).
 */
const TECH_ROLES = [
  'cto', 'chief technology officer',
  'vp engineering', 'vp of engineering',
  'head of engineering', 'engineering director',
  'lead developer', 'senior developer',
  'software engineer', 'tech lead',
  'developer', 'programmer',
  'head of technology', 'chief information officer', 'cio',
  'devops', 'infrastructure',
];

/**
 * Generates an optimized multi-source search prompt for Perplexity AI.
 *
 * The prompt instructs Perplexity to search across:
 * 1. LinkedIn profiles
 * 2. Company website (About/Team page)
 * 3. Facebook
 * 4. Instagram
 * 5. Twitter/X
 * 6. Government business registry (country-specific)
 * 7. GitHub (for tech roles)
 *
 * @param company - Target company name
 * @param role    - Target job title or role
 * @param country - Target country
 * @returns       - Formatted search prompt string
 */
export function generatePrompt(
  company: string,
  role: string,
  country: string
): string {
  // Determine country-specific registry
  const countryLower = country.toLowerCase().trim();
  const isGlobal = !countryLower || countryLower === 'global' || countryLower === 'worldwide';

  const registry = isGlobal
    ? 'global corporate directories and registration portals'
    : (COUNTRY_REGISTRIES[countryLower] ?? 'the government business registry for ' + country);

  // Check if we should include GitHub search
  const roleLower = role.toLowerCase().trim();
  const isTechRole = TECH_ROLES.some(techRole => roleLower.includes(techRole));

  // Build the source list
  const sources = [
    'LinkedIn profiles and company page',
    `${company} official website team/about/leadership page`,
    'Facebook (company page and personal profiles)',
    'Instagram',
    'Twitter/X',
    registry,
  ];

  if (isTechRole) {
    sources.push('GitHub profiles and repositories');
  }

  const sourceList = sources.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const locationPhrase = isGlobal ? 'globally' : `in ${country}`;

  return `
Find people who hold the role of "${role}" at the company "${company}" ${locationPhrase}.

Search across ALL of the following sources:
${sourceList}

For EACH person found, provide the following confirmed public information ONLY:
- Full Name
- Job Title / Position
- Email address (if publicly available)
- Phone number or WhatsApp number (if publicly available)
- LinkedIn profile URL
- Instagram handle or URL (if available)
- Facebook profile or page URL (if available)
- Twitter/X handle or URL (if available)
- Source URL where this information was found

IMPORTANT RULES:
1. Only return confirmed, publicly available data. Do NOT speculate or fabricate information.
2. If a field is not found, explicitly state "Not found" for that field.
3. Clearly separate each person's information with a divider or numbered list.
4. Include the source/citation for each piece of information.
5. If multiple people match the role, list ALL of them.
6. Prioritize accuracy over completeness — it is better to say "Not found" than to guess.
7. Active Search Rule: For each person identified, specifically search for their personal or official social media links (LinkedIn, Instagram, Facebook, and Twitter/X) using their name and company as keywords. Do not list "Not found" for social accounts if they are publicly indexed on major social platforms.
8. Deep Social Search: Before declaring any social media profile (especially LinkedIn, Instagram, Facebook, Twitter/X) as "Not found", you MUST explicitly search for the combination of the person's name and the platform (e.g., search for "[Person Name] Instagram" and "[Person Name] Facebook"). If an account exists publicly, you must extract its handle or URL.

Format each contact as a clearly separated block with labeled fields.
  `.trim();
}
