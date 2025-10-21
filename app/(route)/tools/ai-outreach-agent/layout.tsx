import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Outreach Agent',
  description: 'Generate personalized outreach lists for your target audiences',
}

export default function AIOutreachAgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="container mx-auto max-w-7xl">
      <div className="py-8">
        <h1 className="text-4xl font-bold mb-2">AI Outreach Agent</h1>
        <p className="text-muted-foreground">
          Generate personalized outreach suggestions for your target audiences using AI
        </p>
      </div>
      {children}
    </div>
  )
}