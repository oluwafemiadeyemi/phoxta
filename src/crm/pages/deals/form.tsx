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
import { useCreate } from "@refinedev/core";
import { cn } from "@crm/lib/utils";
import type { Deal, Contact, Company, Tag } from "@crm/types";

const dealFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  contactId: z.string().min(1, "Contact is required"),
  companyId: z.string().optional(),
  value: z.number().min(0, "Value must be positive"),
  status: z.enum(["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]),
  tagIds: z.array(z.string()),
});

type DealFormValues = z.infer<typeof dealFormSchema>;

interface DealFormProps {
  action: "create" | "edit";
  id?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DealForm({ action, id, onSuccess, onCancel }: DealFormProps) {
  // State for contact creation dialog
  const [isContactDialogOpen, setIsContactDialogOpen] = React.useState(false);
  const [newContactName, setNewContactName] = React.useState("");
  const [newContactEmail, setNewContactEmail] = React.useState("");
  const [newContactPhone, setNewContactPhone] = React.useState("");

  const {
    refineCore: { onFinish, formLoading, query },
    ...form
  } = useForm<Deal, HttpError, DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: "",
      contactId: "",
      companyId: "",
      value: 0,
      status: "Lead",
      tagIds: [],
    },
    refineCoreProps: {
      resource: "deals",
      action,
      id,
      redirect: false,
      onMutationSuccess: () => {
        onSuccess?.();
      },
    },
  });

  // Fetch contacts for dropdown
  const { options: contactOptions, query: contactsQuery } = useSelect<Contact>({
    resource: "contacts",
    optionValue: "id",
    optionLabel: "name",
  });

  // Fetch companies for dropdown
  const { options: companyOptions } = useSelect<Company>({
    resource: "companies",
    optionValue: "id",
    optionLabel: "name",
  });

  // Hook for creating new contact
  const { mutate: createContact, mutation: createContactMutation } = useCreate<Contact>();

  // Fetch tags for multi-select
  const { options: tagOptions } = useSelect<Tag>({
    resource: "tags",
    optionValue: "id",
    optionLabel: "name",
    pagination: {
      mode: "off",
    },
  });

  // Handle contact creation
  const handleCreateContact = () => {
    if (!newContactName.trim() || !newContactEmail.trim()) return;

    createContact(
      {
        resource: "contacts",
        values: {
          name: newContactName,
          email: newContactEmail,
          phone: newContactPhone || "+1-555-0000",
          companyId: form.getValues("companyId") || "",
          tagIds: [],
          dealValue: 0,
          status: "Lead",
        },
      },
      {
        onSuccess: (data) => {
          // Close dialog
          setIsContactDialogOpen(false);
          // Clear form
          setNewContactName("");
          setNewContactEmail("");
          setNewContactPhone("");
          // Refetch contacts to update the list
          contactsQuery?.refetch();
          // Auto-select the newly created contact
          if (data?.data?.id) {
            form.setValue("contactId", data.data.id);
          }
        },
      },
    );
  };

  function onSubmit(values: DealFormValues) {
    onFinish(values);
  }

  const isLoading = formLoading || (action === "edit" && query?.isLoading);

  return (
    <LoadingOverlay loading={isLoading}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>
                    Deal Title <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Q1 Enterprise Deal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact */}
            <FormField
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>
                    Contact <span className="text-red-500">*</span>
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("justify-between", !field.value && "text-muted-foreground")}
                          type="button">
                          {field.value
                            ? contactOptions?.find(
                                (option: { value: string | number; label: string }) => option.value === field.value,
                              )?.label
                            : "Select contact..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search contact..." />
                        <CommandList>
                          <CommandEmpty>No contact found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setIsContactDialogOpen(true);
                              }}
                              className="text-primary cursor-pointer">
                              <Plus className="mr-2 h-4 w-4" />
                              Create New Contact
                            </CommandItem>
                            {contactOptions?.map((option: { value: string | number; label: string }) => (
                              <CommandItem
                                value={option.label}
                                key={option.value}
                                onSelect={() => {
                                  form.setValue("contactId", option.value as string);
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
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Deal Value <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" min="0" step="1" {...field} />
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
                  <FormLabel>Pipeline Stage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
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
            <Button type="button" variant="outline" onClick={onCancel} disabled={formLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? "Saving..." : action === "create" ? "Create Deal" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Contact Creation Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="contact-name" className="text-sm font-medium">
                Contact Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="contact-name"
                placeholder="Enter contact name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="contact-email" className="text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="contact-email"
                type="email"
                placeholder="contact@example.com"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="contact-phone" className="text-sm font-medium">
                Phone
              </label>
              <Input
                id="contact-phone"
                placeholder="+1-555-0100"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsContactDialogOpen(false);
                setNewContactName("");
                setNewContactEmail("");
                setNewContactPhone("");
              }}
              disabled={createContactMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateContact}
              disabled={!newContactName.trim() || !newContactEmail.trim() || createContactMutation.isPending}>
              {createContactMutation.isPending ? "Creating..." : "Create Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LoadingOverlay>
  );
}
