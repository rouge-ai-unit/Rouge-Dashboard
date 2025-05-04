import Link from "next/link";
import { Button } from "./ui/button";
import { ExternalLink } from "lucide-react";

export default function Dashboard() {
  const tools = [
    {
      name: "AgTech Company Automation",
      url: "/tools/agtech-company-automation",
      description:
        "A powerful internal automation tool designed to streamline AgTech Company data collection, report generation, and workflow processes. Enables team members to focus on strategy while the tool handles repetitive tasks.",
      unit: "Developed specifically for AgTech Company Outsourcing",
      tab: "table",
    },
    {
      name: "Linkedin Post Content Idea Automation",
      url: "/tools/content-idea-automation",
      description:
        "An Automation that helps create engaging LinkedIn content related to AgTech Industry using user prompts and contextual intelligence. Ideal for marketers and personal brand builders who need to post consistently.",
      unit: "Built to scale LinkedIn presence of Lisa & Morgana",
      tab: "content",
    },
    {
      name: "News Article Summariser Automation",
      url: "/tools/content-idea-automation",
      description:
        "This tool leverages AI to condense long-form articles into digestible summaries and key takeaways. Useful for creating internal briefs or drafting content for newsletters and social posts.",
      unit: "Designed to enhance team's content research",
      tab: "summary",
    },
  ];

  return (
    <main className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-white">
          AI Tools Dashboard
        </h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="flex flex-col justify-between h-full bg-[#1a1a1a] p-6 rounded-xl border border-gray-200/30 shadow-md hover:shadow-lg hover:border-white/50 transition-all"
            >
              <div>
                <h2 className="text-xl font-semibold mb-2 text-white">
                  {tool.name}
                </h2>
                <p className="text-gray-300 text-sm mb-2">{tool.description}</p>
                <p className="text-gray-400 text-xs italic">{tool.unit}</p>
              </div>
              <div className="w-full">
                <Link
                  href={tool.url}
                  rel="noopener noreferrer"
                  onClick={() => {
                    localStorage.setItem("defaultTab", tool.tab);
                  }}
                >
                  <Button className="w-full bg-white text-black px-4 py-2 text-sm rounded-md hover:bg-gray-300 transition">
                   <ExternalLink size={24}/> Open Tool
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
