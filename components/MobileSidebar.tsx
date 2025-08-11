"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  ChartScatter,
  UserCog2,
  LogOut,
  LogIn,
  Menu,
  X,
  Newspaper,
  Mail,
  BrainCircuit,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/" },
  { title: "Analytics", icon: ChartScatter, href: "/stats" },
  { title: "Work Tracker", icon: UserCog2, href: "/work-tracker" },
  {
    title: "Ai News Daily",
    icon: Newspaper,
    href: "/tools/ai-news-daily",
  },
  {
    title: "Content Idea Automation",
    icon: BrainCircuit,
    href: "/tools/content-idea-automation",
  },
  {
    title: "Contact Us",
    icon: Mail,
    href: "/tools/contact",
  },
];

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  const toggleSidebar = () => setOpen((prev) => !prev);

  return (
    <>
      {/* Mobile Hamburger Toggle */}
      <div className="sm:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleSidebar}
          className="bg-[#202222] p-2 rounded-md text-white shadow-md"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-[75%] max-w-xs bg-[#202222] text-white z-50 transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <Link href="/" onClick={toggleSidebar}>
            <Image
              src="/logo.jpg"
              alt="Logo"
              width={40}
              height={40}
              className="rounded-md"
            />
          </Link>
          <button onClick={toggleSidebar}>
            <X size={24} />
          </button>
        </div>

        <nav className="mt-4 flex flex-col space-y-2 px-4">
          {navItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-center gap-4 px-3 py-2 rounded-md hover:bg-[#2a2c2c] transition"
              onClick={toggleSidebar}
            >
              <item.icon size={20} />
              <span className="text-sm">{item.title}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full px-4 py-4 border-t border-gray-700">
          {session ? (
            <>
              <p className="text-sm font-semibold">{session.user?.name}</p>
              <p className="text-xs text-gray-400 mb-3">
                {session.user?.email}
              </p>
              <button
                onClick={() => {
                  signOut();
                  toggleSidebar();
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-sm py-2 rounded-md transition"
              >
                <LogOut className="inline mr-2" />
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/signin" onClick={toggleSidebar}>
              <button className="w-full bg-cyan-500 hover:bg-cyan-700 text-sm py-2 rounded-md transition">
                <LogIn className="inline mr-2" />
                Sign In
              </button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
