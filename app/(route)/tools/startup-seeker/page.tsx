"use client";

import StartupSeekerTool from '@/components/StartupSeekerTool';
import { ToolPageWrapper } from '@/components/guards';

export default function StartupSeekerPage() {
  return (
    <ToolPageWrapper 
      allowedRoles={["admin", "leader", "co-leader"]}
      toolName="Agritech Startup Seeker"
    >
      <div className="min-h-screen bg-background">
        <StartupSeekerTool />
      </div>
    </ToolPageWrapper>
  );
}
