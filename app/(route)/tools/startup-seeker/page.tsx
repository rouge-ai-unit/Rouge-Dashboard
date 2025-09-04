import { Metadata } from 'next';
import StartupSeekerTool from '@/components/StartupSeekerTool';

export const metadata: Metadata = {
  title: 'Agritech Startup Seeker | Rouge Dashboard',
  description: 'Discover and evaluate promising agritech startups for investment opportunities using AI-powered analysis.',
};

export default function StartupSeekerPage() {
  return (
    <div className="min-h-screen bg-background">
      <StartupSeekerTool />
    </div>
  );
}
