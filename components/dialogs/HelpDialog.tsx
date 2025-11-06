"use client";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  ExternalLink, 
  Mail, 
  Newspaper, 
  FileText, 
  Settings, 
  Sparkles,
  Target,
  GraduationCap,
  BrainCircuit,
  UserCog2,
  Calendar,
  Database,
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
      <DialogContent className="bg-gray-900/95 backdrop-blur-md text-gray-100 border-gray-700/50 sm:max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Rouge Dashboard - Help & Documentation
          </DialogTitle>
          <DialogDescription className="text-lg text-gray-300">
            Enterprise-grade AI-powered platform for internal operations and project management
          </DialogDescription>
        </DialogHeader>
        <div className="px-1 pb-2 max-h-[70vh] overflow-y-auto space-y-6 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500">
          
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
                    <li>• Real-time content generation and analysis</li>
                    <li>• Smart automation and workflow optimization</li>
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
                AI-Powered Tools Suite
              </CardTitle>
              <CardDescription>Comprehensive collection of enterprise-grade AI tools</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="agtech-events" className="border-gray-700/50">
                  <AccordionTrigger className="text-blue-400 hover:text-blue-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      AgTech Event Finder
                      <Badge variant="outline" className="border-green-500/30 text-green-400">Live</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Discover and track AgTech startup events worldwide with AI-powered search</p>
                    <p><strong>Features:</strong> Location-based search, advanced filters, CSV export, event caching, database persistence</p>
                    <p><strong>Usage:</strong> Enter location → Browse events → Apply filters → Export results → Register for events</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/agtech-events</code></p>
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

                <AccordionItem value="ai-news" className="border-gray-700/50">
                  <AccordionTrigger className="text-blue-400 hover:text-blue-300">
                    <div className="flex items-center gap-2">
                      <Newspaper className="w-4 h-4" />
                      AI News Daily
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400">Curated</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Stay updated with curated AI news and industry insights</p>
                    <p><strong>Features:</strong> Daily aggregation, article preview with OG images, smart filtering, bookmarking, summarization</p>
                    <p><strong>Usage:</strong> Browse daily feed → Filter by topics → Bookmark articles → Share insights</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/tools/ai-news-daily</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="content-automation" className="border-gray-700/50">
                  <AccordionTrigger className="text-blue-400 hover:text-blue-300">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4" />
                      Content Idea Automation
                      <Badge variant="outline" className="border-purple-500/30 text-purple-400">LinkedIn</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Generate LinkedIn content calendars with AI-powered post ideas</p>
                    <p><strong>Features:</strong> Monthly planning, post captions, hashtag suggestions, special occasions, CSV export</p>
                    <p><strong>Usage:</strong> Select month → Generate ideas → Review content → Export calendar → Schedule posts</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/tools/content-idea-automation</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cold-connect" className="border-gray-700/50">
                  <AccordionTrigger className="text-blue-400 hover:text-blue-300">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Cold Connect Automator
                      <Badge variant="outline" className="border-red-500/30 text-red-400">CRM</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Automate personalized cold outreach campaigns with CRM integration</p>
                    <p><strong>Features:</strong> Contact management, AI personalization, campaign tracking, template library, analytics</p>
                    <p><strong>Integrations:</strong> Notion, Google Sheets, Slack notifications</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/tools/cold-connect-automator</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ai-outreach-agent" className="border-gray-700/50">
                  <AccordionTrigger className="text-blue-400 hover:text-blue-300">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      AI Outreach Agent
                      <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">Lead Gen</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Generate personalized outreach lists with strategic leads and tailored messaging for business development using AI-powered analysis</p>
                    <p><strong>How to use:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Describe your company, products/services, and target market in the company description field</li>
                      <li>Select target audience types (VCs, Corporate Clients, Farmer Cooperatives, Angel Investors, Strategic Partners)</li>
                      <li>Click "Generate Outreach List" to create AI-powered leads with personalized messaging</li>
                      <li>Review and manage leads in the Outreach Portfolio tab</li>
                    </ul>
                    <p><strong>Features:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>AI-powered lead generation using Google Gemini</li>
                      <li>Strategic lead analysis and relevance scoring</li>
                      <li>Personalized outreach message suggestions</li>
                      <li>Advanced filtering and search capabilities</li>
                      <li>Lead status tracking (Active, Contacted, Responded, Archived)</li>
                      <li>Priority management (1-5 scale)</li>
                      <li>Contact information management</li>
                      <li>Multiple export formats (CSV, JSON, Email lists)</li>
                      <li>Real-time statistics and portfolio overview</li>
                      <li>Lead management with notes and follow-up tracking</li>
                      <li>Progress tracking during generation</li>
                      <li>Enterprise-grade data validation and error handling</li>
                    </ul>
                    <p><strong>Limits:</strong> 10 outreach list generations per hour per user</p>
                    <p><strong>Data Storage:</strong> Outreach lists and leads are securely stored with user authentication and audit logging</p>
                    <p><strong>Best Practices:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Provide detailed company descriptions for better lead matching</li>
                      <li>Select 3-5 target audience types for comprehensive coverage</li>
                      <li>Review and customize AI-generated messages before sending</li>
                      <li>Use lead management features to track outreach progress</li>
                      <li>Export successful campaigns for future reference</li>
                    </ul>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/tools/ai-outreach-agent</code></p>
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

                <AccordionItem value="universities" className="border-gray-700/50">
                  <AccordionTrigger className="text-blue-400 hover:text-blue-300">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Agritech Universities
                      <Badge variant="outline" className="border-teal-500/30 text-teal-400">Research</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Explore agritech research institutions and technology transfer offices worldwide</p>
                    <p><strong>Features:</strong> University database, TTO information, incubation records, LinkedIn profiles, CSV export</p>
                    <p><strong>Usage:</strong> Browse institutions → Filter by region → View TTO details → Export contacts</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/tools/agritech-universities</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="work-tracker" className="border-gray-700/50">
                  <AccordionTrigger className="text-blue-400 hover:text-blue-300">
                    <div className="flex items-center gap-2">
                      <UserCog2 className="w-4 h-4" />
                      Work Tracker
                      <Badge variant="outline" className="border-green-500/30 text-green-400">Project Management</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Comprehensive project and task management with team collaboration</p>
                    <p><strong>Features:</strong> Task creation, status tracking, deadline management, team assignment, progress monitoring</p>
                    <p><strong>Usage:</strong> Create tasks → Assign team members → Track progress → Monitor deadlines → Export reports</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/tools/work-tracker</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ai-tools-request" className="border-gray-700/50">
                  <AccordionTrigger className="text-blue-400 hover:text-blue-300">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      AI Tools Request Form
                      <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">Support</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Submit requests for custom AI tools and automation solutions</p>
                    <p><strong>Features:</strong> Structured requirement gathering, ticket tracking, team collaboration, Slack integration</p>
                    <p><strong>Usage:</strong> Fill requirements → Submit request → Track status → Collaborate with team</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/tools/ai-tools-request-form</code></p>
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
                    <li>• <strong>Sidebar:</strong> Access all tools and features</li>
                    <li>• <strong>Search:</strong> Use Ctrl+K to quickly find tools</li>
                    <li>• <strong>Profile:</strong> Settings and help from avatar menu</li>
                    <li>• <strong>Favorites:</strong> Heart icon to bookmark tools</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Specifications */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                Technical Specifications
              </CardTitle>
              <CardDescription>Enterprise-grade architecture and technology stack</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-cyan-400 mb-2">Frontend</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Next.js 15.5 (App Router)</li>
                    <li>• React 19.2 with TypeScript 5.9</li>
                    <li>• Tailwind CSS 4.1 with dark mode</li>
                    <li>• Radix UI + shadcn/ui components</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-green-400 mb-2">Backend</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• PostgreSQL (Neon) with Drizzle ORM</li>
                    <li>• NextAuth.js for authentication</li>
                    <li>• SendGrid for email services</li>
                    <li>• Slack webhooks for notifications</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-400 mb-2">AI Services</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Google Gemini AI (Primary)</li>
                    <li>• DeepSeek AI (Secondary)</li>
                    <li>• OpenAI GPT-4 (Alternative)</li>
                    <li>• Rate limiting and caching</li>
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
                    Access is restricted to Rouge email addresses (.rouge@gmail.com or @rougevc.com). Contact the AI team at ai@rougevc.com for account setup and onboarding.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="tools" className="border-gray-700/50">
                  <AccordionTrigger className="text-orange-400">Which AI tools should I use for my project?</AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    <ul className="space-y-1">
                      <li>• <strong>Event Discovery:</strong> Use AgTech Event Finder for industry events and networking</li>
                      <li>• <strong>Startup Research:</strong> Use Startup Seeker for investment opportunities and market analysis</li>
                      <li>• <strong>Content Marketing:</strong> Use Content Idea Automation for LinkedIn campaigns</li>
                      <li>• <strong>Lead Generation:</strong> Use Cold Connect Automator for outreach campaigns</li>
                      <li>• <strong>Research:</strong> Use Universities tool for academic partnerships</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="export" className="border-gray-700/50">
                  <AccordionTrigger className="text-orange-400">Can I export data from the tools?</AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    Yes! Most tools support CSV export. Look for the <Download className="w-4 h-4 inline" /> export button in each tool. Data includes all visible columns and applied filters.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support" className="border-gray-700/50">
                  <AccordionTrigger className="text-orange-400">How do I get help or report issues?</AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    Use the Contact Us page to submit support tickets, email ai@rougevc.com directly, or reach out via Slack #ai-unit-support channel. Include screenshots and detailed descriptions for faster resolution.
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
                Contact & Support
              </Link>
              <Link className="flex items-center gap-2 text-purple-400 hover:text-purple-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" href="/tools/ai-news-daily">
                <Newspaper className="w-4 h-4"/> 
                AI News Daily
              </Link>
              <Link className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" href="/tools/content-idea-automation">
                <BrainCircuit className="w-4 h-4"/> 
                Content Ideas
              </Link>
              <a className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" target="_blank" rel="noreferrer" href="https://analytics.google.com/">
                <BarChart3 className="w-4 h-4"/> 
                Google Analytics
                <ExternalLink className="w-3 h-3"/>
              </a>
              <a className="flex items-center gap-2 text-orange-400 hover:text-orange-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" href="mailto:ai@rougevc.com">
                <Mail className="w-4 h-4"/> 
                Email Support
              </a>
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <div className="flex gap-2">
            <button 
              onClick={() => onOpenChangeAction(false)} 
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
            >
              Close
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}