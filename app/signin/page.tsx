"use client";

import { signIn } from "next-auth/react";

export default function SignIn() {
  return (
    <div className="flex justify-center items-center h-screen">
      <button
        onClick={() => signIn("google")}
        className="bg-blue-500 text-white p-3 rounded-md"
      >
        Sign in with Google
      </button>
    </div>
  );
}
