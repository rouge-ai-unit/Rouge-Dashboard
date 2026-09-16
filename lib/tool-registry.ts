// ============================================================================
// TOOL REGISTRY — tools retired from the dashboard UI.
// Their code stays in the repo, but they are hidden from every menu and their
// routes (including sub-routes) redirect to /home (see middleware.ts).
// No DB imports: edge-safe.
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
  '/tools/ai-news-daily',
  '/tools/startup-seeker',
  '/tools/sentiment-analyzer',
] as const;

export function isRetiredToolPath(pathname: string): boolean {
  return RETIRED_TOOL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
