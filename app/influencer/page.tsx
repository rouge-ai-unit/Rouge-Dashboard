import Link from "next/link";

export default function InfluencerPage() {
  return (
    <main className="p-10 min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-10 text-center">Influencer Units</h1>

      <div className="flex flex-col md:flex-row justify-center items-center gap-6">
        <Link href="/influencer/content-generator">
          <button className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg shadow-md hover:bg-blue-700 transition">
            LinkedIn Content Generator
          </button>
        </Link>

        <Link href="/influencer/article-summariser">
          <button className="px-8 py-4 bg-green-600 text-white text-lg rounded-lg shadow-md hover:bg-green-700 transition">
            Article Summariser
          </button>
        </Link>
      </div>
    </main>
  );
}
