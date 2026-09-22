// ============================================================================
// AI LIST — the team's external AI assistants (ChatGPT GPTs and Gemini Gems).
// Used by the AI List page and the Home page.
// ============================================================================

export type AiPlatform = 'ChatGPT' | 'Gemini';

export interface AiEntry {
  title: string;
  platform: AiPlatform;
  url: string;
  description?: string;
}

export const AI_LIST: AiEntry[] = [
  {
    title: 'VC Associate',
    platform: 'ChatGPT',
    description: 'Lead finding & LinkedIn drafting',
    url: 'https://chatgpt.com/g/g-6a442a58cbcc8191baf5d6cbff6e3179-vc-associate',
  },
  {
    title: 'Agtech Company Finder',
    platform: 'Gemini',
    description: 'Finding AgTech VCs and startups',
    url: 'https://gemini.google.com/gem/1pZJnDqtA9h0QGH7dKvoyxlO1NKtbsDUW?usp=sharing',
  },
  {
    title: 'Leads Company Filter',
    platform: 'Gemini',
    description:
      'Portfolio screening — built by Henry during the recent AI class; Supratik plans to develop this further',
    url: 'https://gemini.google.com/gem/95013d6db181?usp=sharing',
  },
  {
    // TODO: replace with the description from the gem page.
    title: 'Company Valuation Tool',
    platform: 'Gemini',
    description: 'Company valuation analysis',
    url: 'https://gemini.google.com/gem/1psP1rnFUGtqp-dVB1oTgyq9HBRuaj6C4?usp=sharing',
  },
  {
    title: 'Prompt Generator',
    platform: 'Gemini',
    url: 'https://gemini.google.com/gem/1iSM1UEd4gGPFlBlUXXXmXUE0Zq5p_3mD?usp=sharing',
  },
];
