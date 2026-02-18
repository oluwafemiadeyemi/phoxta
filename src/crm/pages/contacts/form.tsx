import { type HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useSelect } from "@refinedev/core";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import React from "react";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@crm/components/ui/form";
import { Input } from "@crm/components/ui/input";
import { Button } from "@crm/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@crm/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@crm/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@crm/components/ui/command";
import { LoadingOverlay } from "@crm/components/refine-ui/layout/loading-overlay";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@crm/components/ui/dialog";
import { Textarea } from "@crm/components/ui/textarea";
import { useCreate } from "@refinedev/core";
import { cn } from "@crm/lib/utils";
import type { Contact, Company, Tag } from "@crm/types";

const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  companyId: z.string().min(1, "Company is required"),
  tagIds: z.array(z.string()),
  dealValue: z.number().min(0, "Deal value must be positive"),
  status: z.enum(["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  action: "create" | "edit";
  id?: string;
}

export function ContactForm({ action, id }: ContactFormProps) {
  // State for company creation dialog
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = React.useState(false);
  const [newCompanyName, setNewCompanyName] = React.useState("");
  const [newCompanyIndustry, setNewCompanyIndustry] = React.useState("");
  const [newCompanyWebsite, setNewCompanyWebsite] = React.useState("");

  const {
    refineCore: { onFinish, formLoading, query },
    ...form
  } = useForm<Contact, HttpError, ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      companyId: "",
      tagIds: [],
      dealValue: 0,
      status: "Lead",
    },
    refineCoreProps: {
      resource: "contacts",
      action,
      id,
      redirect: "list",
    },
  });

  // Fetch companies for dropdown
  const { options: companyOptions, query: companiesQuery } = useSelect<Company>({
    resource: "companies",
    optionValue: "id",
    optionLabel: "name",
  });

  // Hook for creating new company
  const { mutate: createCompany, mutation: createCompanyMutation } = useCreate<Company>();

  // Fetch tags for multi-select
  const { options: tagOptions } = useSelect<Tag>({
    resource: "tags",
    optionValue: "id",
    optionLabel: "name",
    pagination: {
      mode: "off",
    },
  });

  // Handle company creation
  const handleCreateCompany = () => {
    if (!newCompanyName.trim()) return;

    createCompany(
      {
        resource: "companies",
        values: {
          name: newCompanyName,
          industry: newCompanyIndustry || "Other",
          website: newCompanyWebsite,
          notes: "",
        },
      },
      {
        onSuccess: (data) => {
          // Close dialog
          setIsCompanyDialogOpen(false);
          // Clear form
          setNewCompanyName("");
          setNewCompanyIndustry("");
          setNewCompanyWebsite("");
          // Refetch companies to update the list
          companiesQuery?.refetch();
          // Auto-select the newly created company
          if (data?.data?.id) {
            form.setValue("companyId", data.data.id);
          }
        },
      },
    );
  };

  function onSubmit(values: ContactFormValues) {
    onFinish(values);
  }

  const isLoading = formLoading || (action === "edit" && query?.isLoading);

  return (
    <LoadingOverlay loading={isLoading}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter contact name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Phone <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="+1-555-0100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Company */}
            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Company</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("justify-between", !field.value && "text-muted-foreground")}
                          type="button">
                          {field.value
                            ? companyOptions?.find(
                                (option: { value: string | number; label: string }) => option.value === field.value,
                              )?.label
                            : "Select company..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search company..." />
                        <CommandList>
                          <CommandEmpty>No company found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setIsCompanyDialogOpen(true);
                              }}
                              className="text-primary cursor-pointer">
                              <Plus className="mr-2 h-4 w-4" />
                              Create New Company
                            </CommandItem>
                            {companyOptions?.map((option: { value: string | number; label: string }) => (
                              <CommandItem
                                value={option.label}
                                key={option.value}
                                onSelect={() => {
                                  form.setValue("companyId", option.value as string);
                                }}>
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    option.value === field.value ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                {option.label}
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

            {/* Deal Value */}
            <FormField
              control={form.control}
              name="dealValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Value</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" min="0" step="1000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Qualified">Qualified</SelectItem>
                      <SelectItem value="Proposal">Proposal</SelectItem>
                      <SelectItem value="Negotiation">Negotiation</SelectItem>
                      <SelectItem value="Won">Won</SelectItem>
                      <SelectItem value="Lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Tags - Full width */}
          <FormField
            control={form.control}
            name="tagIds"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Tags</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn("justify-between", !field.value?.length && "text-muted-foreground")}
                        type="button">
                        {field.value?.length
                          ? `${field.value.length} tag${field.value.length > 1 ? "s" : ""} selected`
                          : "Select tags..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search tags..." />
                      <CommandList>
                        <CommandEmpty>No tags found.</CommandEmpty>
                        <CommandGroup>
                          {tagOptions?.map((option: { value: string | number; label: string }) => {
                            const isSelected = field.value?.includes(option.value as string);
                            return (
                              <CommandItem
                                value={option.label}
                                key={option.value}
                                onSelect={() => {
                                  const currentTags = field.value || [];
                                  const tagId = option.value as string;
                                  if (isSelected) {
                                    form.setValue(
                                      "tagIds",
                                      currentTags.filter((id) => id !== tagId),
                                    );
                                  } else {
                                    form.setValue("tagIds", [...currentTags, tagId]);
                                  }
                                }}>
                                <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                {option.label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => window.history.back()} disabled={formLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? "Saving..." : action === "create" ? "Create Contact" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Company Creation Dialog */}
      <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="company-name" className="text-sm font-medium">
                Company Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="company-name"
                placeholder="Enter company name"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCompanyName.trim()) {
                    e.preventDefault();
                    handleCreateCompany();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="company-industry" className="text-sm font-medium">
                Industry
              </label>
              <Input
                id="company-industry"
                placeholder="e.g., SaaS, E-commerce, Healthcare"
                value={newCompanyIndustry}
                onChange={(e) => setNewCompanyIndustry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="company-website" className="text-sm font-medium">
                Website
              </label>
              <Input
                id="company-website"
                type="url"
                placeholder="https://example.com"
                value={newCompanyWebsite}
                onChange={(e) => setNewCompanyWebsite(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCompanyDialogOpen(false);
                setNewCompanyName("");
                setNewCompanyIndustry("");
                setNewCompanyWebsite("");
              }}
              disabled={createCompanyMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateCompany}
              disabled={!newCompanyName.trim() || createCompanyMutation.isPending}>
              {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LoadingOverlay>
  );
}
