// ============================================================================
// TOOL REGISTRY — tools retired from the dashboard UI.
// Their code stays in the repo, but they are hidden from every menu and their
// routes redirect to /home (see middleware.ts). No DB imports: edge-safe.
// ============================================================================

export const RETIRED_TOOL_PATHS = [
  '/tools/ai-tools-request-form',
  '/tools/work-tracker',
  '/tools/agtech-events',
  '/tools/agritech-universities',
  '/tools/cold-connect-automator',
  '/tools/ai-outreach-agent',
  '/tools/content-idea-automation',
  '/tools/agtech-company-automation',
  '/tools/about',
] as const;

// Sub-routes retired while their parent stays live (old news feed detail pages).
const RETIRED_SUBROUTE_PREFIXES = ['/tools/ai-news-daily/'] as const;

export function isRetiredToolPath(pathname: string): boolean {
  return (
    RETIRED_TOOL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    RETIRED_SUBROUTE_PREFIXES.some((p) => pathname.startsWith(p))
  );
}
