// ============================================================================
// CONTACT FINDER PAGE
// Automated professional contact finder with Perplexity AI
// ============================================================================

"use client";

import ContactFinderTool from '@/components/ContactFinderTool';
import { ToolPageWrapper } from '@/components/guards';

export default function ContactFinderPage() {
  return (
    <ToolPageWrapper
      allowedRoles={["admin", "leader", "co-leader", "member"]}
      toolName="Contact Finder"
    >
      <div className="min-h-screen bg-background">
        <ContactFinderTool />
      </div>
    </ToolPageWrapper>
  );
}
