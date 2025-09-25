"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataChart } from "@/components/DataChart";
import { Loader2, RefreshCw, Sprout } from "lucide-react";
import { generateCompanyData, analyzeCompany } from "@/lib/aiGenerate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanyTable } from "@/components/CompanyTable";
import { toast } from "sonner";
import { Company } from "@/types";

export default function AgtechCompanyAutomation() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [CompanyList, setCompanyList] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(
    null
  );
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyList();
    const id = setInterval(fetchCompanyList, 15000);
    return () => clearInterval(id);
  }, []);

  const fetchCompanyList = async () => {
    try {
      const comp_response = await fetch(`/api/companies`);
      if (!comp_response.ok) throw new Error("Failed to fetch companies");
      const companies: Company[] = await comp_response.json();

      setCompanies(companies);

      const companyNames = companies.map((c) => c.companyName).join(", ");
      setCompanyList(companyNames);    } catch (error) {
      console.error(error);
      setError("Could not load company data.");
    }
  };

  const refreshData = () => {
    fetchCompanyList();
  };

  const handleGenerateData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data: Company[] = await generateCompanyData(CompanyList);

      // Persist via API
      for (const company of data) {
        const res = await fetch("/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: company.companyName,
            region: company.region,
            companyWebsite: company.companyWebsite,
            companyLinkedin: company.companyLinkedin,
            industryFocus: company.industryFocus,
            offerings: company.offerings,
            marketingPosition: company.marketingPosition,
            potentialPainPoints: company.potentialPainPoints,
            contactName: company.contactName,
            contactPosition: company.contactPosition,
            linkedin: company.linkedin,
            contactEmail: company.contactEmail,
          }),
        });
        if (!res.ok) throw new Error("Failed to save company");
      }

      toast.success("8 Unique Company Details Generated!");
      refreshData();
      setSelectedCompany(null);
      setAnalysis(null);
      localStorage.setItem("companyData", JSON.stringify(data));
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to generate company data. Please try again.");
      toast.error("Failed to generate company data.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeCompany = async () => {
    if (!selectedCompany) {
      setAnalysis("Please select a company to analyze.");
      return;
    }

    try {
      setAnalyzing(true);
      const result = await analyzeCompany(selectedCompany);
      setAnalysis(result.analysis);
      toast.success(`Analysis complete for ${selectedCompany.companyName}`);
    } catch (error) {
      console.error("Error analyzing company:", error);
      setAnalysis("Failed to fetch analysis.");
      toast.error("Failed to fetch analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <main className="p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-6"
        >
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2 text-white">
            <Sprout className="h-7 w-7 text-green-400" /> Company List ({companies.length})
          </h1>
          <Button
            onClick={handleGenerateData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Generate Data
          </Button>
        </motion.div>

        {error && (
          <div className="mb-4 p-4 text-red-200 bg-red-900/30 border border-red-500/50 rounded-md">
            {error}
          </div>
        )}

        <Tabs defaultValue="table" className="space-y-4">
          <TabsList>
            <TabsTrigger value="table" className="cursor-pointer">
              Table View
            </TabsTrigger>
            <TabsTrigger value="analytics" className="cursor-pointer">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="analysis" className="cursor-pointer">
              Company Analysis
            </TabsTrigger>
          </TabsList>

          {/* Table View */}
          <TabsContent value="table" className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="bg-[#202222] border border-gray-700">
                <CardContent className="mt-5">
                  <CompanyTable
                    data={companies}
                    refreshDataAction={refreshData}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Card className="bg-[#202222] border-gray-700 text-white">
                <CardHeader>
                  <CardTitle>Companies by Region</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataChart data={companies} type="region" />
                </CardContent>
              </Card>

              <Card className="bg-[#202222] border-gray-700 text-white">
                <CardHeader>
                  <CardTitle>Industry Focus Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataChart data={companies} type="industry" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Company Analysis */}
          <TabsContent value="analysis" className="space-y-4">
            <Card className="bg-[#202222] border-gray-700 text-white">
              <CardHeader>
                <CardTitle>Analyze a Company</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {companies.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    <label htmlFor="company-select" className="font-medium">
                      Select a company:
                    </label>
                    <Select
                      value={selectedCompany?.id || ""}
                      onValueChange={(value) => {
                        const company = companies.find((c) => c.id === value) || null;
                        setSelectedCompany(company);
                      }}
                    >
                      <SelectTrigger className="w-full bg-[#2c2e2e] border-gray-600">
                        <SelectValue placeholder="-- Choose a company --" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2c2e2e] text-white border-gray-600">
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={handleAnalyzeCompany}
                      disabled={analyzing || !selectedCompany}
                    >
                      {analyzing ? "Analyzing..." : "Analyze"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500">
                    Generate data to analyze a company.
                  </p>
                )}

                {analysis && (
                  <div className="mt-4 p-4 bg-[#1a1a1a] rounded-md border border-gray-600">
                    <pre className="whitespace-pre-wrap text-sm">{analysis}</pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
