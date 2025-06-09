import Link from "next/link";

export default function Dashboard() {
  const tools = [
    {
      name: "Workflow Intelligence System",
      href: "/tools/agtech-company-automation",
      description:
        "A powerful internal automation tool designed to streamline data collection, report generation, and workflow processes. Enables team members to focus on strategy while the tool handles repetitive tasks.",
      statsLink: "/stats/br-unit",
    },
    {
      name: "Content Intelligence Assistant",
      href: "/tools/content-idea-automation",
      description:
        "An AI-powered assistant that helps generate engaging LinkedIn content from user prompts and summarizes long-form articles into concise key points. Ideal for marketers, personal brand builders, and teams needing to post consistently and speed up content research.",
      statsLink: "/stats/content-generator",
    },
    {
      name: "Work Tracker",
      href: "/work-tracker",
      description:
        "A collaboration space to monitor and update progress on tasks across internal units. Easily track who's doing what, their current status, and more — all from within the dashboard.",
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
    <main className="p-6 min-h-screen">
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
                <h2 className="text-xl font-semibold mb-2 text-black break-words">
                  {tool.name}
                </h2>
                <p className="text-gray-600 text-sm mb-2">{tool.description}</p>
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href={tool.href}
                  className="bg-black text-white px-4 py-2 text-sm rounded-md hover:bg-gray-800"
                >
                  Open Tool
                </Link>
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
                  <h3 className="text-lg font-semibold mb-2 text-white break-words">
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
