export default function Dashboard() {
  const tools = [
    {
      name: "BR Unit Automation",
      url: "https://br-automate.vercel.app/",
      description:
        "A powerful internal automation tool designed to streamline BR Unit's data collection, report generation, and workflow processes. Enables team members to focus on strategy while the tool handles repetitive tasks.",
      unit: "Developed specifically for BR Unit operations",
      statsLink: "/stats/br-unit",
    },
    {
      name: "Influencer Content Generator",
      url: "https://influencer-content-generation-automation.vercel.app/",
      description:
        "An AI-driven assistant that helps create engaging LinkedIn content using user prompts and contextual intelligence. Ideal for marketers and personal brand builders who need to post consistently.",
      unit: "Built for Influencer Unit to scale LinkedIn presence",
      statsLink: "/stats/content-generator",
    },
    {
      name: "Article Summariser",
      url: "https://influencer-unit-automation-article-h99b.onrender.com/",
      description:
        "This tool leverages AI to condense long-form articles into digestible summaries and key takeaways. Useful for creating internal briefs or drafting content for newsletters and social posts.",
      unit: "Designed for Influencer Unit to speed up content research",
      statsLink: "/stats/article-summariser",
    },
  ];

  return (
    <main className="p-6 bg-[#222527] min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-white">
          AI Tools Dashboard
        </h1>
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
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black text-white px-4 py-2 text-sm rounded-md hover:bg-gray-800"
                >
                  Open Tool
                </a>
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
      </div>
    </main>
  );
}
