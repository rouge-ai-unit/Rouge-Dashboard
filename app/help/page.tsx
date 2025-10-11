"use client";
import Link from "next/link";
import CenterPage from "@/components/CenterPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Mail, LifeBuoy, Newspaper, FileText, Settings } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export default function HelpPage() {
  return (
    <CenterPage title="Help &amp; Documentation" description="Quick guides, FAQs, and helpful links.">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Learn the basics and key concepts of the dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-300 space-y-2">
            <p>• Navigation: Use the sidebar to switch between Dashboard, Stats, Tools, and Work Tracker.</p>
            <p>• + New: Quickly create a Work item, Content idea, AI news post, or Support request from the top bar.</p>
            <p>• Notifications: The bell icon aggregates updates from Tickets and Work Tracker. Click an item to jump to the source.</p>
            <p>• Profile: Access Settings, Help, and Sign out from your avatar menu.</p>
          </CardContent>
        </Card>

  <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>How they work and how to configure them.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-300 space-y-2">
            <p>• Polling: The app polls server APIs periodically to fetch new updates.</p>
            <p>• Unread: Items you haven&apos;t seen show as a red badge. Mark all as read to clear the count.</p>
            <p>• Preferences: Go to Settings to change polling interval and enable/disable categories.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>FAQ</CardTitle>
            <CardDescription>Common questions and answers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="notifications">
                <AccordionTrigger>Why don&apos;t I hear a sound for new notifications?</AccordionTrigger>
                <AccordionContent>
                  Ensure sound is enabled in Settings. Your browser may also require a user interaction before audio can play.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="realtime">
                <AccordionTrigger>How do I make notifications more real-time?</AccordionTrigger>
                <AccordionContent>
                  Lower the polling interval in Settings. We recommend 10–30 seconds to balance freshness and network usage.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="unread">
                <AccordionTrigger>How do I clear the unread badge?</AccordionTrigger>
                <AccordionContent>
                  Use “Mark all read” from the bell menu or Reset unread in Settings.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
            <CardDescription>Additional links and support.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link className="flex items-center gap-2 text-blue-400 hover:underline" href="/tools/about"><FileText className="w-4 h-4"/> About</Link>
            <Link className="flex items-center gap-2 text-blue-400 hover:underline" href="/settings"><Settings className="w-4 h-4"/> Settings</Link>
            <a className="flex items-center gap-2 text-blue-400 hover:underline" href="mailto:ai@rougevc.com"><Mail className="w-4 h-4"/> Contact support</a>
            <a className="flex items-center gap-2 text-blue-400 hover:underline" target="_blank" rel="noreferrer" href="https://lookerstudio.google.com/"><ExternalLink className="w-4 h-4"/> Looker Studio</a>
            <a className="flex items-center gap-2 text-blue-400 hover:underline" target="_blank" rel="noreferrer" href="https://analytics.google.com/"><ExternalLink className="w-4 h-4"/> Google Analytics</a>
            <Link className="flex items-center gap-2 text-blue-400 hover:underline" href="/tools/ai-news-daily"><Newspaper className="w-4 h-4"/> AI News</Link>
            <Link className="flex items-center gap-2 text-blue-400 hover:underline" href="/tools/content-idea-automation"><LifeBuoy className="w-4 h-4"/> Content Ideas</Link>
          </CardContent>
        </Card>

    <div className="text-xs text-gray-500 mt-2">Docs v1.1</div>
  </CenterPage>
  );
}
