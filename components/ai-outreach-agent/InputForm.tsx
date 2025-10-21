import React from 'react';
import { LeadType } from '@/types/ai-outreach-agent';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  companyDescription: z.string().min(10, {
    message: "Company description must be at least 10 characters.",
  }),
  targetAudiences: z.array(z.nativeEnum(LeadType)).min(1, {
    message: "Please select at least one target audience.",
  }),
});

type FormData = z.infer<typeof formSchema>;

interface InputFormProps {
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}


// The form component that collects company description and target audiences
export const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading = false }) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyDescription: "",
      targetAudiences: [],
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Outreach List Generator</CardTitle>
        <CardDescription>
          Describe your company and select your target audiences to generate a personalized outreach list.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="companyDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your company, its products/services, and value proposition..."
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetAudiences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Audiences</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(LeadType).map((type) => (
                        <Button
                          key={type}
                          type="button"
                          variant={field.value.includes(type) ? "default" : "outline"}
                          onClick={() => {
                            const newValue = field.value.includes(type)
                              ? field.value.filter(t => t !== type)
                              : [...field.value, type];
                            field.onChange(newValue);
                          }}
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Outreach List"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};