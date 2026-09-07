"use client";

import AiListTool from '@/components/AiListTool';
import { ToolPageWrapper } from '@/components/guards';

export default function AiListPage() {
  return (
    <ToolPageWrapper
      allowedRoles={["admin", "leader", "co-leader", "member"]}
      toolName="AI List"
    >
      <div className="min-h-screen bg-background">
        <AiListTool />
      </div>
    </ToolPageWrapper>
  );
}
