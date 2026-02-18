import { type HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useSelect } from "@refinedev/core";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, ChevronsUpDown, CalendarIcon, Clock, Plus } from "lucide-react";
import dayjs from "dayjs";
import { useState } from "react";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@crm/components/ui/form";
import { Input } from "@crm/components/ui/input";
import { Button } from "@crm/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@crm/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@crm/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@crm/components/ui/command";
import { Calendar } from "@crm/components/ui/calendar";
import { Textarea } from "@crm/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@crm/components/ui/dialog";
import { cn } from "@crm/lib/utils";
import type { Activity, Contact, Deal } from "@crm/types";

const activityFormSchema = z.object({
  type: z.enum(["Call", "Meeting", "Email", "Task", "Demo"], {
    message: "Activity type is required",
  }),
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  contactId: z.string().nullable(),
  dealId: z.string().nullable(),
  notes: z.string(),
  status: z.enum(["Scheduled", "Completed", "Cancelled"]),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

interface QuickActivityCreateProps {
  contactId?: string;
  dealId?: string;
}

export function QuickActivityCreate({ contactId, dealId }: QuickActivityCreateProps) {
  const [open, setOpen] = useState(false);

  const {
    refineCore: { onFinish, formLoading },
    ...form
  } = useForm<Activity, HttpError, ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      type: "Call",
      title: "",
      date: dayjs().format("YYYY-MM-DD"),
      time: dayjs().format("HH:mm"),
      contactId: contactId || null,
      dealId: dealId || null,
      notes: "",
      status: "Scheduled",
      duration: 30,
    },
    refineCoreProps: {
      resource: "activities",
      action: "create",
      redirect: false,
      onMutationSuccess: () => {
        setOpen(false);
        form.reset();
      },
    },
  });

  // Fetch contacts for dropdown
  const { options: contactOptions } = useSelect<Contact>({
    resource: "contacts",
    optionValue: "id",
    optionLabel: "name",
  });

  // Fetch deals for dropdown
  const { options: dealOptions } = useSelect<Deal>({
    resource: "deals",
    optionValue: "id",
    optionLabel: "title",
  });

  function onSubmit(values: ActivityFormValues) {
    // Combine date and time into ISO string
    const dateTimeString = `${values.date}T${values.time}:00Z`;
    const { date: _date, time: _time, ...rest } = values;

    onFinish({
      ...rest,
      date: dateTimeString,
    } as any);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Activity</DialogTitle>
          <DialogDescription>Schedule a new activity for this {contactId ? "contact" : "deal"}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Activity Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Type <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Call">Call</SelectItem>
                        <SelectItem value="Meeting">Meeting</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="Task">Task</SelectItem>
                        <SelectItem value="Demo">Demo</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Title - Full width */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Title <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter activity title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      Date <span className="text-red-500">*</span>
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                            type="button">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? dayjs(field.value).format("MMM DD, YYYY") : "Pick date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? dayjs(field.value).toDate() : undefined}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(dayjs(date).format("YYYY-MM-DD"));
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time */}
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Time <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="time" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duration */}
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="30" min="1" step="15" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact */}
              <FormField
                control={form.control}
                name="contactId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Contact</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn("justify-between", !field.value && "text-muted-foreground")}
                            type="button"
                            disabled={!!contactId}>
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
                                  form.setValue("contactId", null);
                                }}>
                                <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                                None
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

              {/* Deal */}
              <FormField
                control={form.control}
                name="dealId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Deal</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn("justify-between", !field.value && "text-muted-foreground")}
                            type="button"
                            disabled={!!dealId}>
                            {field.value
                              ? dealOptions?.find(
                                  (option: { value: string | number; label: string }) => option.value === field.value,
                                )?.label
                              : "Select deal..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search deal..." />
                          <CommandList>
                            <CommandEmpty>No deal found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => {
                                  form.setValue("dealId", null);
                                }}>
                                <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                                None
                              </CommandItem>
                              {dealOptions?.map((option: { value: string | number; label: string }) => (
                                <CommandItem
                                  value={option.label}
                                  key={option.value}
                                  onSelect={() => {
                                    form.setValue("dealId", option.value as string);
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
            </div>

            {/* Notes - Full width */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any additional notes..." className="min-h-[80px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={formLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? "Creating..." : "Create Activity"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
