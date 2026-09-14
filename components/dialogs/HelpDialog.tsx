"use client";
import React from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Mail,
  Newspaper,
  Settings,
  Sparkles,
  Target,
  Search,
  Zap,
  MessageSquare,
  BarChart3,
  Rocket,
  Globe,
  Lock,
  Bot,
  Download
} from "lucide-react";

export type HelpDialogProps = { open: boolean; onOpenChangeAction: (open: boolean) => void };

export default function HelpDialog({ open, onOpenChangeAction }: HelpDialogProps) {
  const [adminEmail, setAdminEmail] = React.useState("");

  // Fetch admin email dynamically
  React.useEffect(() => {
    const fetchAdminEmail = async () => {
      try {
        const response = await fetch('/api/public/admin-emails');
        if (response.ok) {
          const data = await response.json();
          setAdminEmail(data.primaryEmail || '');
        }
      } catch (error) {
        console.error('Error fetching admin email:', error);
      }
    };
    fetchAdminEmail();
  }, []);

  // Defensive: ensure no lingering overlay blocks clicks after close
  if (!open) {
    try {
      const tidy = () => {
        document.querySelectorAll<HTMLElement>('[data-slot="dialog-overlay"], [data-slot="drawer-overlay"], [data-state="closed"][data-slot="dialog-content"], [data-state="closed"][data-slot="drawer-content"]').forEach((el) => {
          el.style.pointerEvents = "none";
        });
      };
      tidy();
      setTimeout(tidy, 200);
    } catch {}
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="bg-gray-900/95 backdrop-blur-md text-gray-100 border-gray-700/50 sm:max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Rouge Dashboard - Help & Documentation
          </DialogTitle>
          <DialogDescription className="text-lg text-gray-300">
            Enterprise-grade AI-powered platform for internal operations and project management
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-1 space-y-6 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500">

          {/* Platform Overview */}
          <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-sm border-blue-500/30 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Rocket className="w-6 h-6 text-blue-400" />
                Platform Overview
                <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-500/30">Production Ready</Badge>
              </CardTitle>
              <CardDescription className="text-gray-300">
                Rouge Dashboard is a comprehensive enterprise platform built with Next.js 15, React 19, and TypeScript
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-300 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Enterprise Security
                  </h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Database-backed authentication with Rouge email restriction</li>
                    <li>• Account lockout protection (5 failed attempts)</li>
                    <li>• Comprehensive audit logging and session management</li>
                    <li>• Password reset via SendGrid with secure tokens</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-400 mb-2 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    AI Integration
                  </h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Google Gemini AI, DeepSeek, and OpenAI support</li>
                    <li>• Ready-made prompts for public LLMs (Grok, Gemini, ChatGPT)</li>
                    <li>• Team Gems and GPTs in one list</li>
                    <li>• Enterprise-grade AI safety and compliance</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI-Powered Tools */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="w-6 h-6 text-yellow-400" />
                Tools
              </CardTitle>
              <CardDescription>What each tool does and how to use it</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="contact-finder" className="border-gray-700/50">
                  <AccordionTrigger className="text-blue-400 hover:text-blue-300">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Contact Finder
                      <Badge variant="outline" className="border-green-500/30 text-green-400">Hunter.io</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Look up professional work emails</p>
                    <p><strong>Usage:</strong> Search by name + company for one best email, or by job title + company for matching contacts. Results are checked for deliverability.</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/tools/contact-finder</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ai-list" className="border-gray-700/50">
                  <AccordionTrigger className="text-blue-400 hover:text-blue-300">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      AI List
                      <Badge variant="outline" className="border-purple-500/30 text-purple-400">Gems & GPTs</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> The team&apos;s maintained Gemini Gems and ChatGPT GPTs for VC work (lead finding, portfolio screening, company valuation and more)</p>
                    <p><strong>Usage:</strong> Click an assistant to open it in a new tab</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/tools/ai-list</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ai-news" className="border-gray-700/50">
                  <AccordionTrigger className="text-blue-400 hover:text-blue-300">
                    <div className="flex items-center gap-2">
                      <Newspaper className="w-4 h-4" />
                      AI News Daily
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400">Prompt</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> A ready-made prompt for today&apos;s AI and AgTech news briefing</p>
                    <p><strong>Usage:</strong> Click Open in Grok or ChatGPT to run it directly, or Open in Gemini (the prompt is copied — just paste)</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/tools/ai-news-daily</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="startup-seeker" className="border-gray-700/50">
                  <AccordionTrigger className="text-blue-400 hover:text-blue-300">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Agritech Startup Seeker
                      <Badge variant="outline" className="border-orange-500/30 text-orange-400">AI Scoring</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Find and analyze agritech startups with multi-factor AI scoring system</p>
                    <p><strong>Scoring:</strong> Location Score (0-100), Readiness Score (0-100), Feasibility Score (0-100), Rouge Score (weighted)</p>
                    <p><strong>Features:</strong> Contact research automation, priority flagging, export capabilities, database persistence</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/tools/startup-seeker</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sentiment-analyzer" className="border-gray-700/50">
                  <AccordionTrigger className="text-blue-400 hover:text-blue-300">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Sentiment Analyzer
                      <Badge variant="outline" className="border-pink-500/30 text-pink-400">AI Analysis</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Analyze public sentiment about companies using AI-powered news analysis</p>
                    <p><strong>Features:</strong> Real-time news search, AI sentiment classification (Positive/Negative/Neutral), detailed reasoning, country-specific search, CSV export, search history</p>
                    <p><strong>AI Models:</strong> Gemini (fast, accurate) or DeepSeek (cost-effective)</p>
                    <p><strong>Usage:</strong> Enter company name → Select country (optional) → Choose AI model → Analyze sentiment → Filter/sort results → Export data</p>
                    <p><strong>Limits:</strong> 100 searches per day per user (resets at midnight)</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/tools/sentiment-analyzer</code></p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Getting Started */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Getting Started Guide
              </CardTitle>
              <CardDescription>Quick start guide for new users</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-300 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2">🚀 First Steps</h4>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Sign in with your Rouge email account</li>
                    <li>Explore the dashboard and available tools</li>
                    <li>Set up your profile and preferences</li>
                    <li>Join relevant Slack channels for notifications</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold text-green-400 mb-2">📱 Navigation</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Sidebar:</strong> Access all tools; collapse it with the panel icon at the top</li>
                    <li>• <strong>Search:</strong> Use Ctrl+K on Home to quickly find tools</li>
                    <li>• <strong>Account menu:</strong> Settings, Contact admin and Sign out from your name at the bottom of the sidebar or the avatar menu</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-400" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>Common questions and troubleshooting</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="access" className="border-gray-700/50">
                  <AccordionTrigger className="text-orange-400">How do I get access to the platform?</AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    Access is restricted to Rouge email addresses (.rouge@gmail.com or @rougevc.com). Contact the AI team at {adminEmail} for account setup and onboarding.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="tools" className="border-gray-700/50">
                  <AccordionTrigger className="text-orange-400">Which tool should I use?</AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    <ul className="space-y-1">
                      <li>• <strong>Finding emails:</strong> Contact Finder</li>
                      <li>• <strong>Lead finding, screening, valuation:</strong> the Gems and GPTs in AI List</li>
                      <li>• <strong>Daily news:</strong> AI News Daily prompt</li>
                      <li>• <strong>Events and anything else:</strong> ask a public LLM (Gemini, Grok, ChatGPT) directly</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="export" className="border-gray-700/50">
                  <AccordionTrigger className="text-orange-400">Can I export data from the tools?</AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    Startup Seeker and Sentiment Analyzer support CSV export. Look for the <Download className="w-4 h-4 inline" /> export button in each tool.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support" className="border-gray-700/50">
                  <AccordionTrigger className="text-orange-400">How do I get help or report issues?</AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    Use Contact admin in the account menu to submit a support ticket, email {adminEmail} directly, or reach out via Slack #ai-unit-support channel. Include screenshots and detailed descriptions for faster resolution.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Resources */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                Resources & Links
              </CardTitle>
              <CardDescription>Additional resources and external links</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <Link className="flex items-center gap-2 text-blue-400 hover:text-blue-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" href="/settings">
                <Settings className="w-4 h-4"/>
                Settings & Preferences
              </Link>
              <Link className="flex items-center gap-2 text-green-400 hover:text-green-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" href="/tools/contact">
                <Mail className="w-4 h-4"/>
                Contact admin
              </Link>
              <Link className="flex items-center gap-2 text-purple-400 hover:text-purple-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" href="/tools/ai-list">
                <Bot className="w-4 h-4"/>
                AI List
              </Link>
              <Link className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" href="/tools/ai-news-daily">
                <Newspaper className="w-4 h-4"/>
                AI News Daily
              </Link>
              <a className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" target="_blank" rel="noreferrer" href="https://analytics.google.com/">
                <BarChart3 className="w-4 h-4"/>
                Google Analytics
                <ExternalLink className="w-3 h-3"/>
              </a>
              <a className="flex items-center gap-2 text-orange-400 hover:text-orange-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" href={`mailto:${adminEmail}`}>
                <Mail className="w-4 h-4"/>
                Email Support
              </a>
            </CardContent>
          </Card>
        </div>
        <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t border-gray-700/50">
          <button
            onClick={() => onOpenChangeAction(false)}
            className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
