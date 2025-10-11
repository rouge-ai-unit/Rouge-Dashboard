"use client";
import React from "react";

type CenterPageProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function CenterPage({ title, description, children }: CenterPageProps) {
  return (
    <main className="min-h-screen w-full flex items-start justify-center p-4 sm:p-6">
      <section className="w-full max-w-4xl bg-gray-900/50 backdrop-blur-sm text-gray-100 rounded-2xl border border-gray-700/50 shadow-2xl">
        <header className="px-6 pt-5 pb-2">
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          ) : null}
        </header>
        <div className="px-6 pb-6">
          {children}
        </div>
      </section>
    </main>
  );
}
