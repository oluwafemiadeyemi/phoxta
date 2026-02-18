import { type HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useList } from "@refinedev/core";
import { Check, ChevronsUpDown } from "lucide-react";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@crm/components/ui/form";
import { Input } from "@crm/components/ui/input";
import { Button } from "@crm/components/ui/button";
import { Textarea } from "@crm/components/ui/textarea";
import { LoadingOverlay } from "@crm/components/refine-ui/layout/loading-overlay";
import { Popover, PopoverContent, PopoverTrigger } from "@crm/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@crm/components/ui/command";
import { cn } from "@crm/lib/utils";
import type { Company } from "@crm/types";

const companyFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  industry: z.string().min(1, "Industry is required"),
  website: z.string().url("Invalid URL").or(z.literal("")),
  notes: z.string(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

interface CompanyFormProps {
  action: "create" | "edit";
  id?: string;
}

export function CompanyForm({ action, id }: CompanyFormProps) {
  const [industryOpen, setIndustryOpen] = useState(false);
  const [industrySearch, setIndustrySearch] = useState("");

  // Fetch existing unique industries from companies (limited for performance)
  const { result: companiesResult } = useList<Company>({
    resource: "companies",
    pagination: { pageSize: 200 },
  });

  // Extract unique industries
  const existingIndustries = Array.from(
    new Set(
      (companiesResult?.data || [])
        .map((company: Company) => company.industry)
        .filter((industry: string | undefined): industry is string => Boolean(industry)),
    ),
  ).sort();

  // Default industries if none exist
  const defaultIndustries = ["SaaS", "E-commerce", "Healthcare", "Finance", "Education", "Manufacturing", "Other"];
  const industries: string[] = existingIndustries.length > 0 ? existingIndustries : defaultIndustries;

  const {
    refineCore: { onFinish, formLoading, query },
    ...form
  } = useForm<Company, HttpError, CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "",
      industry: "",
      website: "",
      notes: "",
    },
    refineCoreProps: {
      resource: "companies",
      action,
      id,
      redirect: "list",
    },
  });

  function onSubmit(values: CompanyFormValues) {
    onFinish(values);
  }

  const isLoading = formLoading || (action === "edit" && query?.isLoading);

  return (
    <LoadingOverlay loading={isLoading}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {action === "create" ? "Create New Company" : "Edit Company"}
            </h1>
            <p className="text-slate-600">
              {action === "create"
                ? "Add a new company to your CRM system"
                : "Update company information"}
            </p>
          </div>

          {/* Main content in grid layout with glassmorphism */}
          <div className="bg-gradient-to-br from-white via-blue-50/20 to-white border border-blue-200/30 rounded-xl p-8 backdrop-blur-sm shadow-lg shadow-blue-100/20">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">
                        Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter company name"
                          className="bg-white/60 border border-slate-200/50 rounded-lg focus:border-blue-400/70 focus:bg-white transition-all"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Industry - Combobox with custom values */}
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-slate-700 font-semibold">
                        Industry <span className="text-red-500">*</span>
                      </FormLabel>
                      <Popover open={industryOpen} onOpenChange={setIndustryOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={industryOpen}
                              className={cn(
                                "justify-between bg-white/60 border border-slate-200/50 rounded-lg hover:border-blue-400/70 hover:bg-white transition-all",
                                !field.value && "text-muted-foreground"
                              )}>
                              {field.value || "Select or type industry"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search or type new industry..."
                              value={industrySearch}
                              onValueChange={setIndustrySearch}
                            />
                            <CommandList>
                              <CommandEmpty>
                                <div className="py-2 px-2 text-sm">
                                  <button
                                    type="button"
                                    className="w-full text-left hover:bg-accent hover:text-accent-foreground rounded-sm px-2 py-1.5"
                                    onClick={() => {
                                      if (industrySearch.trim()) {
                                        field.onChange(industrySearch.trim());
                                        setIndustryOpen(false);
                                        setIndustrySearch("");
                                      }
                                    }}>
                                    + Create &quot;{industrySearch}&quot;
                                  </button>
                                </div>
                              </CommandEmpty>
                              <CommandGroup>
                                {industries.map((industry) => (
                                  <CommandItem
                                    key={industry}
                                    value={industry}
                                    onSelect={() => {
                                      field.onChange(industry);
                                      setIndustryOpen(false);
                                      setIndustrySearch("");
                                    }}>
                                    <Check
                                      className={cn("mr-2 h-4 w-4", field.value === industry ? "opacity-100" : "opacity-0")}
                                    />
                                    {industry}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Website */}
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Website</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com"
                          className="bg-white/60 border border-slate-200/50 rounded-lg focus:border-blue-400/70 focus:bg-white transition-all"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes - Full width */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes about the company..."
                        rows={5}
                        className="bg-white/60 border border-slate-200/50 rounded-lg focus:border-blue-400/70 focus:bg-white transition-all resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
              disabled={formLoading}
              className="border-slate-200/50 hover:bg-slate-50 transition-all">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={formLoading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-blue-200/50 transition-all">
              {formLoading ? "Saving..." : action === "create" ? "Create Company" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </LoadingOverlay>
  );
}
