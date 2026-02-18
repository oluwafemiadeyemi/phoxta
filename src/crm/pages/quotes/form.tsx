import { type HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useSelect } from "@refinedev/core";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, ChevronsUpDown, Plus, Trash2, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import React from "react";
import { useSearchParams } from "react-router";
import { useCurrency } from "@crm/hooks/use-currency";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@crm/components/ui/form";
import { Input } from "@crm/components/ui/input";
import { Button } from "@crm/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@crm/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@crm/components/ui/command";
import { LoadingOverlay } from "@crm/components/refine-ui/layout/loading-overlay";
import { Textarea } from "@crm/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@crm/components/ui/select";
import { Badge } from "@crm/components/ui/badge";
import { Alert, AlertDescription } from "@crm/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@crm/components/ui/dialog";
import { useCreate } from "@refinedev/core";
import { cn } from "@crm/lib/utils";
import type { Quote, Contact, Company } from "@crm/types";

const lineItemSchema = z.object({
  id: z.string(),
  product: z.string().min(1, "Product name is required"),
  description: z.string(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be positive"),
  total: z.number(),
});

const quoteFormSchema = z
  .object({
    contactId: z.string().min(1, "Contact is required"),
    companyId: z.string().min(1, "Company is required"),
    dealId: z.string().nullable().optional(),
    quoteDate: z.string().min(1, "Quote date is required"),
    expiryDate: z.string().min(1, "Expiry date is required"),
    lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
    subtotal: z.number(),
    taxRate: z.number().min(0).max(100),
    discount: z.number().min(0),
    grandTotal: z.number(),
    notes: z.string(),
    status: z.enum(["Draft", "Sent", "Accepted", "Rejected", "Expired"]),
  })
  .refine(
    (data) => {
      // Validate that expired quotes cannot be accepted
      const expiryDate = new Date(data.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (data.status === "Accepted" && expiryDate < today) {
        return false;
      }
      return true;
    },
    {
      message: "Cannot accept an expired quote. Please update the expiry date first.",
      path: ["status"],
    },
  );

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

const statusColors = {
  Draft: "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-300",
  Sent: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300",
  Accepted: "bg-green-100 text-green-800 hover:bg-green-100 border-green-300",
  Rejected: "bg-red-100 text-red-800 hover:bg-red-100 border-red-300",
  Expired: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-300",
};

const statusDescriptions = {
  Draft: "Quote is being prepared and not yet sent to client",
  Sent: "Quote has been sent to client and awaiting response",
  Accepted: "Client has accepted the quote",
  Rejected: "Client has rejected the quote",
  Expired: "Quote has passed its expiry date",
};

interface QuoteFormProps {
  action: "create" | "edit";
  id?: string;
}

export function QuoteForm({ action, id }: QuoteFormProps) {
  const [searchParams] = useSearchParams();
  const { symbol, format } = useCurrency();

  // State for company creation dialog
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = React.useState(false);
  const [newCompanyName, setNewCompanyName] = React.useState("");
  const [newCompanyIndustry, setNewCompanyIndustry] = React.useState("");
  const [newCompanyWebsite, setNewCompanyWebsite] = React.useState("");

  // Get pre-fill values from URL query parameters
  const dealIdFromQuery = searchParams.get("dealId");
  const contactIdFromQuery = searchParams.get("contactId");
  const companyIdFromQuery = searchParams.get("companyId");

  const {
    refineCore: { onFinish, formLoading, query },
    ...form
  } = useForm<Quote, HttpError, QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      contactId: contactIdFromQuery || "",
      companyId: companyIdFromQuery || "",
      dealId: dealIdFromQuery || null,
      quoteDate: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      lineItems: [
        {
          id: crypto.randomUUID(),
          product: "",
          description: "",
          quantity: 1,
          price: 0,
          total: 0,
        },
      ],
      subtotal: 0,
      taxRate: 10,
      discount: 0,
      grandTotal: 0,
      notes: "",
      status: "Draft",
    },
    refineCoreProps: {
      resource: "quotes",
      action,
      id,
      redirect: "list",
    },
  });

  // Fetch contacts for dropdown
  const { options: contactOptions } = useSelect<Contact>({
    resource: "contacts",
    optionValue: "id",
    optionLabel: "name",
  });

  // Fetch companies for dropdown
  const { options: companyOptions, query: companiesQuery } = useSelect<Company>({
    resource: "companies",
    optionValue: "id",
    optionLabel: "name",
  });

  // Hook for creating new company
  const { mutate: createCompany, mutation: createCompanyMutation } = useCreate<Company>();

  // Auto-populate company when contact is selected
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "contactId" && value.contactId) {
        const contact = query?.data?.data;
        // In a real scenario, we'd fetch the contact to get their companyId
        // For now, this is just a placeholder pattern
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, query?.data?.data]);

  const recalculateTotals = (items: QuoteFormValues["lineItems"]) => {
    const subtotal = items.reduce((sum, item) => {
      const quantity = Number(item.quantity ?? 0) || 0;
      const price = Number(item.price ?? 0) || 0;
      const total = Number(item.total ?? 0) || quantity * price;
      return sum + total;
    }, 0);

    const taxRate = Number(form.getValues("taxRate") ?? 0) || 0;
    const discount = Number(form.getValues("discount") ?? 0) || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const grandTotal = subtotal + taxAmount - discount;

    form.setValue("subtotal", subtotal, { shouldValidate: false });
    form.setValue("grandTotal", Math.max(0, grandTotal), { shouldValidate: false });
  };

  const updateLineItemTotals = (index: number, nextQuantity?: number, nextPrice?: number) => {
    const current = form.getValues("lineItems") || [];
    const updated = current.map((item, itemIndex) => {
      if (itemIndex !== index) {
        const quantity = Number(item.quantity ?? 0) || 0;
        const price = Number(item.price ?? 0) || 0;
        return { ...item, total: quantity * price };
      }

      const quantity = typeof nextQuantity === "number" ? nextQuantity : Number(item.quantity ?? 0) || 0;
      const price = typeof nextPrice === "number" ? nextPrice : Number(item.price ?? 0) || 0;
      return { ...item, quantity, price, total: quantity * price };
    });

    form.setValue("lineItems", updated, { shouldValidate: false, shouldDirty: true });
    recalculateTotals(updated);
  };

  // Calculate totals when tax or discount changes
  useEffect(() => {
    const subscription = form.watch((_value, { name }) => {
      if (name === "taxRate" || name === "discount") {
        recalculateTotals(form.getValues("lineItems") || []);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

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

  function onSubmit(values: QuoteFormValues) {
    // Generate quote number if creating new quote
    const submissionData = {
      ...values,
      quoteNumber:
        action === "create"
          ? `Q-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`
          : query?.data?.data?.quoteNumber,
      statusHistory:
        action === "create"
          ? [
              {
                id: `status-${Date.now()}`,
                status: values.status,
                timestamp: new Date().toISOString(),
              },
            ]
          : query?.data?.data?.statusHistory || [],
    };
    onFinish(submissionData);
  }

  const isLoading = formLoading || (action === "edit" && query?.isLoading);

  const addLineItem = () => {
    const currentLineItems = form.getValues("lineItems") || [];
    form.setValue("lineItems", [
      ...currentLineItems,
      {
        id: crypto.randomUUID(),
        product: "",
        description: "",
        quantity: 1,
        price: 0,
        total: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    const currentLineItems = form.getValues("lineItems") || [];
    if (currentLineItems.length > 1) {
      form.setValue(
        "lineItems",
        currentLineItems.filter((_, i) => i !== index),
      );
    }
  };

  const lineItems = form.watch("lineItems") || [];
  const subtotal = Number(form.watch("subtotal") ?? 0) || 0;
  const taxRate = Number(form.watch("taxRate") ?? 0) || 0;
  const discount = Number(form.watch("discount") ?? 0) || 0;
  const grandTotal = Number(form.watch("grandTotal") ?? 0) || 0;
  const taxAmount = (subtotal * taxRate) / 100;

  // Check if quote is expired
  const expiryDate = form.watch("expiryDate");
  const currentStatus = form.watch("status");
  const originalStatus = query?.data?.data?.status;
  const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;

  // Get available status options based on current status and expiry
  const getAvailableStatuses = () => {
    if (action === "create") {
      return ["Draft", "Sent"];
    }

    const current = originalStatus || currentStatus;

    // If already in final state, limit transitions
    if (current === "Accepted") {
      return ["Accepted"]; // Cannot change from Accepted
    }
    if (current === "Rejected") {
      return ["Rejected", "Draft"]; // Can reopen as draft
    }
    if (current === "Expired") {
      return ["Expired", "Draft"]; // Can reopen as draft if expiry extended
    }

    // Draft can go anywhere
    if (current === "Draft") {
      return ["Draft", "Sent"];
    }

    // Sent can become anything except back to Draft (workflow)
    if (current === "Sent") {
      return isExpired ? ["Sent", "Expired", "Rejected"] : ["Sent", "Accepted", "Rejected", "Expired"];
    }

    return ["Draft", "Sent", "Accepted", "Rejected", "Expired"];
  };

  const availableStatuses = getAvailableStatuses();

  return (
    <LoadingOverlay loading={isLoading}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4">
          {/* Status Badge - Show prominently at top for edit mode */}
          {action === "edit" && originalStatus && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Current Status:</span>
                <Badge variant="outline" className={statusColors[originalStatus]}>
                  {originalStatus}
                </Badge>
              </div>
              {isExpired && originalStatus !== "Expired" && (
                <Alert className="w-auto py-2 px-3 border-orange-300 bg-orange-50 flex items-center">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-sm text-orange-800 ml-2">This quote has expired</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Deal Link Info - Show if quote is linked to a deal */}
          {(dealIdFromQuery || form.watch("dealId")) && (
            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-900">
                <AlertCircle className="h-4 w-4" />
                <span>This quote is linked to Deal #{(dealIdFromQuery || form.watch("dealId"))?.slice(0, 8)}</span>
              </div>
            </div>
          )}

          {/* Contact and Company Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <FormLabel>
                    Company <span className="text-red-500">*</span>
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

            {/* Quote Date */}
            <FormField
              control={form.control}
              name="quoteDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quote Date <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expiry Date */}
            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Expiry Date <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Status Management - Show for both create and edit */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Status <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <span>{status}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>{statusDescriptions[field.value as keyof typeof statusDescriptions]}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Warning for status changes */}
          {action === "edit" && originalStatus && originalStatus !== currentStatus && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You are about to change the quote status from <strong>{originalStatus}</strong> to{" "}
                <strong>{currentStatus}</strong>. This action will be recorded.
              </AlertDescription>
            </Alert>
          )}

          {/* Line Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Line Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Product/Service</th>
                      <th className="text-left p-3 text-sm font-medium">Description</th>
                      <th className="text-left p-3 text-sm font-medium w-24">Quantity</th>
                      <th className="text-left p-3 text-sm font-medium w-32">Unit Price</th>
                      <th className="text-left p-3 text-sm font-medium w-32">Total</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.product`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Product name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="p-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Description" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="p-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={Number(field.value ?? 0)}
                                    onChange={(e) => {
                                      const v = e.currentTarget.value;
                                      const nextValue = v === "" ? 0 : e.currentTarget.valueAsNumber;
                                      field.onChange(nextValue);
                                      updateLineItemTotals(index, nextValue, undefined);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="p-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.price`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={Number(field.value ?? 0)}
                                    onChange={(e) => {
                                      const v = e.currentTarget.value;
                                      const nextValue = v === "" ? 0 : e.currentTarget.valueAsNumber;
                                      field.onChange(nextValue);
                                      updateLineItemTotals(index, undefined, nextValue);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{format(item.total)}</div>
                        </td>
                        <td className="p-3">
                          {lineItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLineItem(index)}
                              className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end">
            <div className="w-full md:w-1/2 space-y-4">
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{format(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center gap-4">
                  <FormField
                    control={form.control}
                    name="taxRate"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-sm">Tax Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={Number(field.value ?? 0)}
                            onChange={(e) => {
                              const v = e.currentTarget.value;
                              field.onChange(v === "" ? 0 : e.currentTarget.valueAsNumber);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col items-end justify-end pt-6">
                    <span className="font-medium">{format(taxAmount)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center gap-4">
                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-sm">Discount ({symbol})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={Number(field.value ?? 0)}
                            onChange={(e) => {
                              const v = e.currentTarget.value;
                              field.onChange(v === "" ? 0 : e.currentTarget.valueAsNumber);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col items-end justify-end pt-6">
                    <span className="font-medium text-destructive">-{format(discount)}</span>
                  </div>
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">Grand Total:</span>
                    <span className="font-bold text-xl">{format(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Add any additional notes or terms..." rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => window.history.back()} disabled={formLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? "Saving..." : action === "create" ? "Create Quote" : "Save Changes"}
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
