"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Shield, ArrowLeft, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import RequestAccessButton from "@/components/RequestAccessButton";
import { Suspense } from "react";

function UnauthorizedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toolName = searchParams.get('tool');
  const toolPath = searchParams.get('path');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white dark:bg-gray-800 border-red-500/30">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <CardTitle className="text-2xl">Access Not Available</CardTitle>
          <CardDescription className="text-base mt-2">
            You don&apos;t have permission to access this resource
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium mb-2">Why am I seeing this?</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                  <li>This feature requires specific permissions</li>
                  <li>Your current role may not have access</li>
                  <li>The resource may be restricted to certain units</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-2 text-gray-700 dark:text-gray-300">Need Access?</p>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  If you believe you should have access to this resource, please contact your administrator or the AI Unit team.
                </p>
                <Link href="/tools/contact">
                  <Button variant="outline" size="sm" className="w-full">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {toolName && toolPath && (
              <RequestAccessButton
                toolName={toolName}
                toolPath={toolPath}
                className="w-full"
              />
            )}
            <Button onClick={() => router.back()} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Link href="/home" className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <UnauthorizedContent />
    </Suspense>
  );
}
