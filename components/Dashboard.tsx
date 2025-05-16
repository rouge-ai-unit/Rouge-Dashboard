import Link from "next/link";

export default function Dashboard() {
  const tools = [
    {
      name: "BR Unit Automation",
      href: "/br",
      description:
        "A powerful internal automation tool designed to streamline BR Unit's data collection, report generation, and workflow processes. Enables team members to focus on strategy while the tool handles repetitive tasks.",
      unit: "Developed specifically for BR Unit operations",
      statsLink: "/stats/br-unit",
    },
    {
      name: "Influencer Content Generator",
      href: "/influencer/content-generator",
      description:
        "An AI-driven assistant that helps create engaging LinkedIn content using user prompts and contextual intelligence. Ideal for marketers and personal brand builders who need to post consistently.",
      unit: "Built for Influencer Unit to scale LinkedIn presence",
      statsLink: "/stats/content-generator",
    },
    {
      name: "Article Summariser",
      href: "/influencer/article-summariser",
      description:
        "This tool leverages AI to condense long-form articles into digestible summaries and key takeaways. Useful for creating internal briefs or drafting content for newsletters and social posts.",
      unit: "Designed for Influencer Unit to speed up content research",
      statsLink: "/stats/article-summariser",
    },
    {
      name: "Work Tracker",
      href: "/work-tracker",
      description:
        "A collaboration space to monitor and update progress on tasks across internal units. Easily track who's doing what, their current status, and more — all from within the dashboard.",
      unit: "Internal tool for all units to coordinate ongoing work",
      statsLink: null,
    },
  ];

  const toBeLaunched = [
    {
      name: "Content Calendar Planner",
      description:
        "Plan, schedule, and visualize LinkedIn posts and campaigns for maximum engagement and consistency.",
      unit: "Upcoming for Influencer Unit and marketing teams",
    },
    {
      name: "Insight Dashboard",
      description:
        "An AI-based analytics layer providing engagement insights, growth trends, and content impact analysis.",
      unit: "Coming soon for all internal teams",
    },
    {
      name: "Voice Summary Assistant",
      description:
        "Summarize voice notes into crisp text summaries, ideal for meetings or brainstorming sessions.",
      unit: "In development for cross-team collaboration",
    },
  ];

  return (
    <main className="p-6 bg-[#222527] min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-white">
          AI Tools Dashboard
        </h1>

        {/* Tools Section */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="flex flex-col justify-between h-full bg-white p-6 rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all"
            >
              <div>
                <h2 className="text-xl font-semibold mb-2 text-black">
                  {tool.name}
                </h2>
                <p className="text-gray-600 text-sm mb-2">{tool.description}</p>
                <p className="text-gray-500 text-xs italic">{tool.unit}</p>
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href={tool.href}
                  className="bg-black text-white px-4 py-2 text-sm rounded-md hover:bg-gray-800"
                >
                  Open Tool
                </Link>
                {tool.statsLink && (
                  <a
                    href={tool.statsLink}
                    className="border border-black text-black px-4 py-2 text-sm rounded-md hover:bg-black hover:text-white transition"
                  >
                    View Stats
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* To Be Launched Section */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold mb-6 text-white text-center">
            To Be Launched Soon
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {toBeLaunched.map((tool) => (
              <div
                key={tool.name}
                className="flex flex-col justify-between h-full bg-[#2b2f31] p-6 rounded-xl border border-gray-700 shadow-inner"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-white">
                    {tool.name}
                  </h3>
                  <p className="text-gray-300 text-sm mb-2">
                    {tool.description}
                  </p>
                  <p className="text-gray-400 text-xs italic">{tool.unit}</p>
                </div>
                <div className="mt-4 text-right">
                  <span className="text-yellow-400 text-xs font-medium tracking-wide">
                    COMING SOON
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
