import React, { useState, useEffect } from 'react';
import { LeadType, LEAD_TYPE_LABELS, LEAD_TYPE_DESCRIPTIONS } from '@/types/ai-outreach-agent';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormDataSchema } from '@/types/ai-outreach-agent';
import { Loader2, Info, Target, Users, Settings, Sparkles } from 'lucide-react';
import * as z from "zod";

type FormData = z.infer<typeof FormDataSchema>;

interface InputFormProps {
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading = false }) => {
  const form = useForm<FormData>({
    resolver: zodResolver(FormDataSchema),
    defaultValues: {
      companyDescription: "",
      targetAudiences: [],
    },
  });

  const watchedAudiences = form.watch("targetAudiences");
  const [progress, setProgress] = useState(0);

  // Simulate progress during loading
  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev; // Don't go to 100% until actually complete
          return prev + Math.random() * 15;
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
      const timeout = setTimeout(() => setProgress(0), 1000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  return (
    <div className="space-y-6">
      {/* Company Description Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Company Profile
          </CardTitle>
          <CardDescription>
            Tell us about your company to generate highly targeted outreach leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <FormField
              control={form.control}
              name="companyDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">
                    Company Description *
                  </FormLabel>
                  <FormDescription>
                    Provide a detailed description of your company, including your products/services,
                    target market, unique value proposition, and current goals.
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder="Example: We are an AI-powered agritech startup developing precision farming solutions that help farmers optimize crop yields using satellite imagery and machine learning. Our platform provides real-time insights on soil health, weather patterns, and irrigation needs, serving mid-sized farms across North America..."
                      className="min-h-[120px] resize-y"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="text-sm text-muted-foreground">
                    {field.value.length}/2000 characters
                  </div>
                </FormItem>
              )}
            />
          </Form>
        </CardContent>
      </Card>

      {/* Target Audiences Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Target Audiences
          </CardTitle>
          <CardDescription>
            Select the types of organizations you want to reach out to for strategic partnerships and business development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <FormField
              control={form.control}
              name="targetAudiences"
              render={() => (
                <FormItem>
                  <FormDescription className="mb-4">
                    Choose up to 5 audience types for a comprehensive outreach strategy. Each selection will generate tailored leads and messaging.
                  </FormDescription>
                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.values(LeadType).map((type) => (
                      <FormField
                        key={type}
                        control={form.control}
                        name="targetAudiences"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={type}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(type)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, type])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== type
                                          )
                                        )
                                  }}
                                  disabled={isLoading}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-medium cursor-pointer">
                                  {LEAD_TYPE_LABELS[type]}
                                </FormLabel>
                                <FormDescription className="text-xs">
                                  {LEAD_TYPE_DESCRIPTIONS[type]}
                                </FormDescription>
                              </div>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                  {watchedAudiences.length > 0 && (
                    <div className="text-sm text-muted-foreground mt-4">
                      Selected: {watchedAudiences.length} audience{watchedAudiences.length !== 1 ? 's' : ''} ({5 - watchedAudiences.length} remaining)
                    </div>
                  )}
                </FormItem>
              )}
            />
          </Form>
        </CardContent>
      </Card>

      {/* Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Generate Outreach List
          </CardTitle>
          <CardDescription>
            Create a personalized list of strategic leads with tailored outreach messaging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="space-y-3 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      Generating your personalized outreach list...
                    </span>
                    <span className="text-blue-700 dark:text-blue-300">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2 mt-2" />
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Analyzing your company profile and generating strategic leads with tailored messaging
                  </p>
                </div>
              </div>
            </div>
          )}

          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons Section */}
          <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border-2 border-blue-200 dark:border-blue-800">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="submit"
                disabled={isLoading || !form.formState.isValid}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none"
                size="lg"
                onClick={form.handleSubmit(onSubmit)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Outreach List...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-5 w-5" />
                    Generate Outreach List
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={isLoading}
                size="lg"
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
              >
                <Settings className="mr-2 h-4 w-4" />
                Reset Form
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};