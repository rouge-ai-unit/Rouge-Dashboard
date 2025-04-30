'use client';

import { useEffect, useState } from 'react';

export default function AiNewsPage() {
  const [aiNews, setAiNews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('https://script.google.com/macros/s/AKfycbzcrOsF7Lym1lKFgyPNoy3g1h4v8R4Cg-pmlllNECY-8Xuweq0ZXx9G8q2G2ATNqlsrjA/exec');
        const data = await res.json();

        // Ensure data has the 'message' field and it is a string to split
        if (data && typeof data.message === 'string') {
          const lines = data.message.split('\n').filter((line: string) => line.trim() !== '');
          setAiNews(lines);
        } else {
          throw new Error('Invalid data format: message field is missing or not a string.');
        }
      } catch (err) {
        setError('Failed to fetch AI news.');
        console.error(err);
      }
    };

    fetchNews();
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">AI News of the Day</h1>
      {error && <p className="text-red-500">{error}</p>}
      <ul className="list-disc pl-5 space-y-2">
        {aiNews.length > 0 ? (
          aiNews.map((news, index) => (
            <li key={index}>{news}</li>
          ))
        ) : (
          <p>No AI news available at the moment.</p>
        )}
      </ul>
    </main>
  );
}
