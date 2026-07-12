// ============================================================================
// CONTACT FINDER — ENTITY EXTRACTOR (NLP)
// Core Named Entity Recognition pipeline for extracting structured contact
// data from unstructured Perplexity AI responses.
//
// This module implements a regex-based NER approach that:
//   1. Segments raw text into per-person blocks
//   2. Extracts contact entities (email, phone, URLs) via pattern matching
//   3. Identifies names using capitalized word heuristics near title keywords
//   4. Maps extracted data to source citations
//   5. Assigns confidence scores based on data completeness
//   6. Deduplicates results by name similarity
//
// This is the academic contribution of the research — each step is
// extensively documented for reproducibility.
// ============================================================================

import { ContactEntity } from '@/types/contact-finder';

// ============================================================================
// REGEX PATTERNS
// Pre-compiled regular expressions for entity extraction.
// These patterns are designed to handle common formats found in web sources.
// ============================================================================

/**
 * Email pattern — RFC 5322 simplified.
 * Matches: user.name+tag@domain.co.uk
 * Avoids: partial matches inside URLs or code
 */
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

/**
 * Phone number pattern — international format.
 * Matches: +62 812 3456 7890, (021) 555-1234, +1-800-555-0199
 * Requires minimum 7 digits to avoid false positives with years/IDs.
 */
const PHONE_REGEX = /(?:\+?[\d]{1,4}[\s\-.]?)?\(?[\d]{1,5}\)?[\s\-.]?[\d]{1,5}[\s\-.]?[\d]{1,5}(?:[\s\-.]?[\d]{1,5})?/g;

/**
 * LinkedIn profile URL pattern.
 * Matches: linkedin.com/in/username, www.linkedin.com/in/john-doe-123
 */
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-]+\/?/g;

/**
 * Instagram URL/handle pattern.
 * Matches: instagram.com/username, @username (when in Instagram context)
 */
const INSTAGRAM_REGEX = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?/g;

/**
 * Facebook URL pattern.
 * Matches: facebook.com/username, facebook.com/profile.php?id=123
 */
const FACEBOOK_REGEX = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+\/?/g;

/**
 * Twitter/X URL pattern.
 * Matches: twitter.com/username, x.com/username
 */
const TWITTER_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+\/?/g;

/**
 * General URL pattern for source extraction.
 */
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;

// ============================================================================
// TITLE KEYWORDS
// Used to identify name-title pairs in unstructured text.
// ============================================================================

const TITLE_KEYWORDS = [
  // C-Level
  'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'CIO', 'CISO', 'CPO', 'CRO', 'CLO',
  'Chief Executive Officer', 'Chief Technology Officer', 'Chief Financial Officer',
  'Chief Operating Officer', 'Chief Marketing Officer', 'Chief Information Officer',
  // VP / Director / Head
  'VP', 'Vice President', 'SVP', 'EVP',
  'Director', 'Managing Director', 'Executive Director',
  'Head of', 'Head',
  // Manager / Lead
  'Manager', 'Senior Manager', 'General Manager',
  'Lead', 'Team Lead', 'Tech Lead',
  // Founder / Partner
  'Founder', 'Co-Founder', 'Co-founder',
  'Partner', 'Managing Partner', 'Senior Partner',
  // Specific roles
  'President', 'Chairman', 'Chairperson',
  'Secretary', 'Treasurer',
  'Analyst', 'Senior Analyst',
  'Consultant', 'Senior Consultant',
  'Engineer', 'Senior Engineer',
  'Advisor', 'Board Member',
  'Investment', 'Portfolio',
];

// ============================================================================
// STEP 1: TEXT SEGMENTATION
// Split the raw Perplexity response into individual person blocks.
// ============================================================================

/**
 * Splits raw text into blocks, where each block is expected to contain
 * information about a single person.
 *
 * Detection heuristics:
 *   - Markdown headers (### Name)
 *   - Numbered list patterns (1., 2., 3., etc.)
 *   - Double newline separation
 *   - Horizontal rule separators (---, ***)
 *   - "Name:" or "Person:" labels
 *
 * @param rawText - The raw response text from Perplexity
 * @returns       - Array of text blocks, one per person
 */
function splitIntoPersonBlocks(rawText: string): string[] {
  // Normalize line endings
  const text = rawText.replace(/\r\n/g, '\n').trim();

  // Strategy 1: Split by markdown headers (### or ##)
  const headerPattern = /(?:^|\n)#{2,3}\s+/;
  if (headerPattern.test(text)) {
    const blocks = text.split(/(?:^|\n)#{2,3}\s+/).filter(b => b.trim().length > 20);
    if (blocks.length >= 1) return blocks;
  }

  // Strategy 2: Split by numbered list pattern (e.g., "1.", "2.", "**1.**")
  const numberedPattern = /(?:^|\n)(?:\*{0,2})?\s*\d+[\.\)]\s+/;
  if (numberedPattern.test(text)) {
    // Check if the numbered list is listing fields of a single person rather than multiple people.
    // If it's listing fields, we will find labels like "full name", "job title", "email", "phone" immediately following the number.
    const isFieldList = /(?:^|\n)(?:\*{0,2})?\s*\d+[\.\)]\s+\*?(?:full\s*name|job\s*title|position|email|phone|whatsapp|linkedin|source|instagram|facebook|twitter|x\.com)\b/i.test(text);

    if (!isFieldList) {
      const blocks = text.split(/(?:^|\n)(?:\*{0,2})?\s*\d+[\.\)]\s+/).filter(b => b.trim().length > 20);
      if (blocks.length >= 1) return blocks;
    }
  }

  // Strategy 3: Split by horizontal rules or bold separators
  const separatorPattern = /\n(?:---+|\*\*\*+|___+)\n/;
  if (separatorPattern.test(text)) {
    const blocks = text.split(separatorPattern).filter(b => b.trim().length > 20);
    if (blocks.length >= 1) return blocks;
  }

  // Strategy 4: Split by double newlines (paragraph breaks)
  const paragraphBlocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 20);
  if (paragraphBlocks.length >= 1) return paragraphBlocks;

  // Fallback: treat entire text as a single block
  return [text];
}

// ============================================================================
// STEP 2: ENTITY EXTRACTION HELPERS
// ============================================================================

/**
 * Extracts the first match of a regex from a text block.
 * Returns null if no match is found.
 */
function extractFirst(text: string, regex: RegExp): string | null {
  const match = text.match(regex);
  return match ? match[0].replace(/\/+$/, '') : null; // trim trailing slashes
}

/**
 * Extracts all matches of a regex from a text block.
 */
function extractAll(text: string, regex: RegExp): string[] {
  const matches = text.match(regex);
  return matches ? [...new Set(matches.map(m => m.replace(/\/+$/, '')))] : [];
}

/**
 * Cleans citation numbers (like [1], [2], or [1, 2]) from a string.
 */
function cleanCitation(text: string): string {
  return text.replace(/\[\d+(?:,\s*\d+)*\]/g, '').trim();
}

/**
 * Validates that a phone string actually contains enough digits to be a phone number.
 */
function isValidPhone(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

// ============================================================================
// STEP 3: NAME EXTRACTION
// Identify the person's full name using capitalized word heuristics.
// ============================================================================

/**
 * Extracts a person's name from a text block.
 *
 * Heuristics used (in priority order):
 *   1. Labeled pattern: "Name: John Doe" or "Full Name: Jane Smith"
 *   2. Bold pattern: "**John Doe**" at the start of a block
 *   3. First line if it's short and contains capitalized words
 *   4. Capitalized words near title keywords
 *
 * @param block - Text block for a single person
 * @returns     - Extracted name or "Unknown"
 */
function extractName(block: string): string {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);

  // Heuristic 1: Labeled pattern — "Name: ..." or "Full Name: ..."
  for (const line of lines) {
    const cleanLine = line.replace(/\*\*/g, '').trim();
    const colonIdx = cleanLine.indexOf(':');
    if (colonIdx !== -1) {
      const label = cleanLine.substring(0, colonIdx).toLowerCase().trim();
      const value = cleanLine.substring(colonIdx + 1).trim();
      if (label.includes('full name') || label === 'name') {
        const name = cleanCitation(value);
        if (name.length > 1 && name.length < 80) return name;
      }
    }
  }

  // Heuristic 2: Bold pattern at start of block — "**John Doe**"
  for (const line of lines.slice(0, 3)) {
    const boldMatch = line.match(/^\*\*([A-Z][a-zA-Z\s\-'\.]+?)\*\*/);
    if (boldMatch) {
      const name = boldMatch[1].trim();
      if (name.length > 1 && name.length < 80 && !TITLE_KEYWORDS.some(t => {
        const regex = new RegExp(`\\b${t}\\b`, 'i');
        return regex.test(name);
      })) {
        return name;
      }
    }
  }

  // Heuristic 3: First line if it looks like a name
  // A name line is typically short, starts with a capital, has 2-5 words
  if (lines.length > 0) {
    const firstLine = lines[0].replace(/^\*+|\*+$/g, '').replace(/^#+\s*/, '').trim();
    const cleanFirst = cleanCitation(firstLine).replace(/^\d+\.\s+/, '');
    const words = cleanFirst.split(/\s+/);
    const looksLikeName = (
      words.length >= 2 &&
      words.length <= 5 &&
      cleanFirst.length < 60 &&
      /^[A-Z]/.test(cleanFirst) &&
      !cleanFirst.includes(':') &&
      !cleanFirst.includes('http') &&
      !TITLE_KEYWORDS.some(t => {
        const regex = new RegExp(`\\b${t}\\b`, 'i');
        return regex.test(cleanFirst);
      })
    );
    if (looksLikeName) return cleanFirst;
  }

  // Heuristic 4: Capitalized words near title keywords
  for (const line of lines) {
    const cleanLine = line.replace(/\*\*/g, '').trim();
    for (const title of TITLE_KEYWORDS) {
      const regex = new RegExp(`\\b${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const match = cleanLine.match(regex);
      if (match && match.index !== undefined) {
        // Look for capitalized words before the title
        const before = cleanLine.substring(0, match.index).trim();
        const nameMatch = before.match(/([A-Z][a-zA-Z\-'\.]+(?:\s+[A-Z][a-zA-Z\-'\.]+)+)/);
        if (nameMatch) {
          return cleanCitation(nameMatch[1].trim());
        }
      }
    }
  }

  return 'Unknown';
}

// ============================================================================
// STEP 3b: TITLE EXTRACTION
// Identify the person's job title from the text block.
// ============================================================================

/**
 * Extracts a person's job title from a text block.
 *
 * Heuristics:
 *   1. Labeled pattern: "Title: CTO" or "Position: Head of Engineering"
 *   2. Known title keywords found in context
 *   3. Text between name and first contact field
 *
 * @param block - Text block for a single person
 * @returns     - Extracted title or "Unknown"
 */
function extractTitle(block: string): string {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);

  // Heuristic 1: Labeled pattern
  for (const line of lines) {
    const cleanLine = line.replace(/\*\*/g, '').trim();
    const colonIdx = cleanLine.indexOf(':');
    if (colonIdx !== -1) {
      const label = cleanLine.substring(0, colonIdx).toLowerCase().trim();
      const value = cleanLine.substring(colonIdx + 1).trim();
      if (label.includes('job title') || label.includes('position') || label === 'role' || label.includes('designation')) {
        const title = cleanCitation(value);
        if (title.length > 1 && title.length < 120 && title.toLowerCase() !== 'not found') {
          return title;
        }
      }
    }
  }

  // Heuristic 2: Find title keywords in context using word boundary matching
  for (const line of lines) {
    const cleanLine = line.replace(/\*\*/g, '').trim();
    for (const keyword of TITLE_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(?:\\s+(?:of|for|at|in|-|–)\\s+[A-Za-z\\s]+)?`, 'i');
      const match = cleanLine.match(regex);
      if (match) {
        const title = cleanCitation(match[0].trim());
        if (title.length > 2 && title.length < 120) {
          return title;
        }
      }
    }
  }

  return 'Unknown';
}

// ============================================================================
// STEP 4: SOURCE URL MATCHING
// Match extracted data to source citations from Perplexity.
// ============================================================================

/**
 * Finds the most relevant source URL for a person block.
 *
 * Matching strategy:
 *   1. URLs found directly in the text block
 *   2. Citation references (e.g., [1], [2]) mapped to citation array
 *   3. First available citation as fallback
 *
 * @param block     - Text block for a single person
 * @param citations - Array of citation URLs from Perplexity
 * @returns         - Best matching source URL
 */
function matchSourceUrl(block: string, citations: string[]): string {
  // Strategy 1: URLs directly in the block
  const blockUrls = extractAll(block, URL_REGEX);
  if (blockUrls.length > 0) {
    // Prefer LinkedIn or company URLs over generic ones
    const preferredUrl = blockUrls.find(u =>
      u.includes('linkedin.com/in/') || u.includes('company')
    );
    if (preferredUrl) return preferredUrl;
    return blockUrls[0];
  }

  // Strategy 2: Citation references like [1], [2]
  const citationRefs = block.match(/\[(\d+)\]/g);
  if (citationRefs && citations.length > 0) {
    const firstRef = parseInt(citationRefs[0].replace(/[\[\]]/g, ''), 10);
    const index = firstRef - 1; // citations are typically 1-indexed
    if (index >= 0 && index < citations.length) {
      return citations[index];
    }
  }

  // Strategy 3: Fallback to first citation
  if (citations.length > 0) {
    return citations[0];
  }

  return 'No source available';
}

// ============================================================================
// STEP 5: CONFIDENCE SCORING
// Assign a confidence level based on the completeness of extracted data.
// ============================================================================

/**
 * Assigns a confidence score to an extracted contact based on data quality.
 *
 * Scoring rules:
 *   - HIGH:   Email found AND (LinkedIn OR phone) found
 *   - MEDIUM: LinkedIn OR phone found (without email)
 *   - LOW:    Name only, no verifiable contact information
 *
 * @param entity - Partially constructed contact entity
 * @returns      - Confidence level: 'high', 'medium', or 'low'
 */
function assignConfidence(
  entity: Pick<ContactEntity, 'email' | 'phone' | 'linkedin'>
): ContactEntity['confidence'] {
  const hasEmail = entity.email !== null;
  const hasPhone = entity.phone !== null;
  const hasLinkedin = entity.linkedin !== null;

  if (hasEmail && (hasLinkedin || hasPhone)) {
    return 'high';
  }

  if (hasLinkedin || hasPhone || hasEmail) {
    return 'medium';
  }

  return 'low';
}

// ============================================================================
// STEP 6: DEDUPLICATION
// Remove duplicate contacts by comparing name similarity.
// ============================================================================

/**
 * Simple string similarity using Dice coefficient.
 * Computes the similarity between two strings as a value between 0 and 1.
 *
 * @param a - First string
 * @param b - Second string
 * @returns - Similarity score (0 = completely different, 1 = identical)
 */
function nameSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const s1 = normalize(a);
  const s2 = normalize(b);

  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  // Bigram-based Dice coefficient
  const getBigrams = (s: string): Set<string> => {
    const bigrams = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.add(s.substring(i, i + 2));
    }
    return bigrams;
  };

  const bigrams1 = getBigrams(s1);
  const bigrams2 = getBigrams(s2);

  let intersection = 0;
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) intersection++;
  }

  return (2 * intersection) / (bigrams1.size + bigrams2.size);
}

/**
 * Deduplicates contacts by name similarity.
 * When duplicates are found, the contact with more data (higher confidence) is kept.
 *
 * @param contacts - Array of extracted contacts
 * @returns        - Deduplicated array
 */
function deduplicateContacts(contacts: ContactEntity[]): ContactEntity[] {
  const SIMILARITY_THRESHOLD = 0.7;
  const result: ContactEntity[] = [];

  for (const contact of contacts) {
    const isDuplicate = result.some(existing =>
      nameSimilarity(existing.name, contact.name) >= SIMILARITY_THRESHOLD
    );

    if (!isDuplicate) {
      result.push(contact);
    } else {
      // If duplicate has better confidence, replace the existing one
      const existingIdx = result.findIndex(existing =>
        nameSimilarity(existing.name, contact.name) >= SIMILARITY_THRESHOLD
      );
      if (existingIdx >= 0) {
        const confidenceRank = { high: 3, medium: 2, low: 1 };
        if (confidenceRank[contact.confidence] > confidenceRank[result[existingIdx].confidence]) {
          result[existingIdx] = contact;
        }
      }
    }
  }

  return result;
}

// ============================================================================
// HELPER: Filter out "Not found" values
// ============================================================================

/**
 * Returns null if the value indicates "not found" or is empty.
 */
function cleanValue(value: string | null): string | null {
  if (!value) return null;
  const lower = value.toLowerCase().trim();
  if (
    lower === 'not found' ||
    lower === 'n/a' ||
    lower === 'not available' ||
    lower === 'none' ||
    lower === 'unknown' ||
    lower === '-' ||
    lower === ''
  ) {
    return null;
  }
  return value.trim();
}

// ============================================================================
// MAIN FUNCTION: parseEntities
// The primary NER pipeline that orchestrates all extraction steps.
// ============================================================================

/**
 * Parses unstructured text from Perplexity AI and extracts structured contact
 * entities using a multi-step NLP pipeline.
 *
 * Pipeline steps:
 *   1. Segment text into per-person blocks
 *   2. Extract entities (email, phone, social URLs) via regex and targeted line parsing
 *   3. Extract name and title using capitalized word heuristics
 *   4. Match source URL from citations
 *   5. Assign confidence score
 *   6. Deduplicate by name similarity
 *
 * @param rawText   - The unstructured text response from Perplexity AI
 * @param citations - Array of source URLs from Perplexity citations
 * @returns         - Array of structured ContactEntity objects
 */
export function parseEntities(rawText: string, citations: string[]): ContactEntity[] {
  console.log('[EntityExtractor] Starting NER pipeline...');

  // ──────────────────────────────────────────────────────────────────────────
  // Step 1: Segment text into per-person blocks
  // ──────────────────────────────────────────────────────────────────────────
  const blocks = splitIntoPersonBlocks(rawText);
  console.log(`[EntityExtractor] Step 1: Found ${blocks.length} person block(s)`);

  const contacts: ContactEntity[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    console.log(`[EntityExtractor] Processing block ${i + 1}/${blocks.length}`);

    // Check if the block is just introductory or explanatory text
    if (i === 0 && blocks.length > 1) {
      const blockLower = block.toLowerCase();
      if (blockLower.includes('holds the role') || blockLower.includes('search results') || blockLower.includes('no other individuals')) {
        console.log(`[EntityExtractor] Skipping introductory block ${i + 1}`);
        continue;
      }
    }

    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);

    let name: string | null = null;
    let title: string | null = null;
    let email: string | null = null;
    let phone: string | null = null;
    let linkedin: string | null = null;
    let instagram: string | null = null;
    let facebook: string | null = null;
    let twitter: string | null = null;
    let source: string | null = null;

    // ────────────────────────────────────────────────────────────────────────
    // Step 2: Line-by-line targeted structured parsing
    // ────────────────────────────────────────────────────────────────────────
    for (const line of lines) {
      const cleanLine = line.replace(/\*\*/g, '').trim();
      const colonIdx = cleanLine.indexOf(':');
      if (colonIdx !== -1) {
        const label = cleanLine.substring(0, colonIdx).toLowerCase().trim();
        const value = cleanLine.substring(colonIdx + 1).trim();
        const valueLower = value.toLowerCase();

        // Skip fields that explicitly state "not found"
        if (
          valueLower.startsWith('not found') ||
          valueLower === 'none' ||
          valueLower === 'n/a' ||
          valueLower === 'not available' ||
          valueLower === 'unknown'
        ) {
          continue;
        }

        const valueCleaned = cleanCitation(value);

        if (label.includes('full name') || label === 'name') {
          name = valueCleaned;
        } else if (label.includes('job title') || label.includes('position') || label === 'role') {
          title = valueCleaned;
        } else if (label.includes('email')) {
          email = extractFirst(value, EMAIL_REGEX);
        } else if (label.includes('phone') || label.includes('whatsapp')) {
          const match = extractFirst(value, PHONE_REGEX);
          if (match && isValidPhone(match)) {
            phone = match;
          }
        } else if (label.includes('linkedin')) {
          linkedin = extractFirst(value, LINKEDIN_REGEX);
        } else if (label.includes('instagram')) {
          instagram = extractFirst(value, INSTAGRAM_REGEX);
        } else if (label.includes('facebook')) {
          facebook = extractFirst(value, FACEBOOK_REGEX);
        } else if (label.includes('twitter') || label.includes('x.com')) {
          twitter = extractFirst(value, TWITTER_REGEX);
        } else if (label.includes('source url') || label === 'source') {
          source = extractFirst(value, URL_REGEX);
        }
      } else {
        const numberMatch = cleanLine.match(/^\d+\.\s+(.+)$/);
        if (numberMatch && !name) {
          name = cleanCitation(numberMatch[1]);
        }
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Step 3: Heuristic fallbacks if name or title were not resolved
    // ────────────────────────────────────────────────────────────────────────
    if (!name) {
      name = extractName(block);
    }
    if (!title) {
      title = extractTitle(block);
    }

    // Skip blocks that don't look like person entries
    if (name === 'Unknown' && title === 'Unknown' && !email && !linkedin) {
      console.log(`[EntityExtractor] Skipping block ${i + 1} — insufficient data`);
      continue;
    }

    // Skip blocks that are actually just template labels (defense in depth)
    const forbiddenNames = [
      'full name', 'job title', 'position', 'email address', 
      'phone number', 'whatsapp number', 'linkedin profile', 
      'instagram handle', 'facebook profile', 'twitter/x', 
      'source url'
    ];
    if (name && forbiddenNames.some(fn => name.toLowerCase().includes(fn))) {
      console.log(`[EntityExtractor] Skipping block ${i + 1} — name matched forbidden template field: "${name}"`);
      continue;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Step 4: Fallbacks for email, phone, and socials
    // ────────────────────────────────────────────────────────────────────────
    const cleanBlockText = block.replace(/\*\*/g, '');
    const cleanBlockLower = cleanBlockText.toLowerCase();

    if (!email && !cleanBlockLower.includes('email address: not found') && !cleanBlockLower.includes('email: not found')) {
      email = extractFirst(block, EMAIL_REGEX);
    }
    if (!phone && !cleanBlockLower.includes('phone number: not found') && !cleanBlockLower.includes('phone: not found') && !cleanBlockLower.includes('whatsapp number: not found')) {
      const phoneMatches = extractAll(block, PHONE_REGEX).filter(isValidPhone);
      if (phoneMatches.length > 0) {
        for (const p of phoneMatches) {
          const idx = block.indexOf(p);
          const context = block.substring(Math.max(0, idx - 20), idx);
          // Avoid extracting phone numbers that are part of standard URL paths or parameters
          if (!context.includes('/') && !context.includes('http')) {
            phone = p;
            break;
          }
        }
      }
    }
    if (!linkedin) linkedin = extractFirst(block, LINKEDIN_REGEX);
    if (!instagram) instagram = extractFirst(block, INSTAGRAM_REGEX);
    if (!facebook) facebook = extractFirst(block, FACEBOOK_REGEX);
    if (!twitter) twitter = extractFirst(block, TWITTER_REGEX);

    // ────────────────────────────────────────────────────────────────────────
    // Step 5: Clean values, resolve source, and build contact
    // ────────────────────────────────────────────────────────────────────────
    const finalEmail = cleanValue(email);
    const finalPhone = cleanValue(phone);
    const finalLinkedin = cleanValue(linkedin);
    const finalInstagram = cleanValue(instagram);
    const finalFacebook = cleanValue(facebook);
    const finalTwitter = cleanValue(twitter);

    const finalSource = source || matchSourceUrl(block, citations);
    const confidence = assignConfidence({ email: finalEmail, phone: finalPhone, linkedin: finalLinkedin });

    contacts.push({
      name: name ? name.trim() : 'Unknown',
      title: title ? title.trim() : 'Unknown',
      email: finalEmail,
      phone: finalPhone,
      linkedin: finalLinkedin,
      instagram: finalInstagram,
      facebook: finalFacebook,
      twitter: finalTwitter,
      source: finalSource,
      confidence,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 6: Deduplicate by name similarity
  // ──────────────────────────────────────────────────────────────────────────
  const deduplicated = deduplicateContacts(contacts);
  console.log(
    `[EntityExtractor] Pipeline complete: ${contacts.length} extracted → ${deduplicated.length} after dedup`
  );

  return deduplicated;
}
