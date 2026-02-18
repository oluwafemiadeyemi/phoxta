import { useEffect } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { CompanySettings } from "@crm/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Button } from "@crm/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@crm/components/ui/select";
import { Textarea } from "@crm/components/ui/textarea";
import { Upload, X } from "lucide-react";

const currencies = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "CHF", label: "CHF - Swiss Franc" },
  { value: "CNY", label: "CNY - Chinese Yuan" },
];

const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona Time" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT/AEST)" },
];

export const CompanySettingsPage = () => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    refineCore: { onFinish, formLoading },
  } = useForm<CompanySettings>({
    refineCoreProps: {
      resource: "companySettings",
      id: "00000000-0000-0000-0000-000000000001",
      action: "edit",
      redirect: false,
    },
  });

  const currency = watch("currency");
  const timezone = watch("timezone");
  const logo = watch("logo");

  useEffect(() => {
    // Ensure a sensible default for first-time setup
    if (!watch("currency")) setValue("currency", "GBP" as any, { shouldValidate: true });
  }, [setValue, watch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("companySettings");
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as {
        companyName?: string;
        logo?: string | null;
        termsConditions?: string | null;
        paymentDetails?: string | null;
      };
      if (stored.companyName && !watch("companyName")) {
        setValue("companyName", stored.companyName, { shouldValidate: true });
      }
      if (stored.logo && !watch("logo")) {
        setValue("logo", stored.logo, { shouldValidate: true });
      }
      if (stored.termsConditions && !watch("termsConditions")) {
        setValue("termsConditions", stored.termsConditions, { shouldValidate: true });
      }
      if (stored.paymentDetails && !watch("paymentDetails")) {
        setValue("paymentDetails", stored.paymentDetails, { shouldValidate: true });
      }
    } catch {
      // ignore
    }
  }, [setValue, watch]);

  const handleSave = (values: CompanySettings) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "companySettings",
        JSON.stringify({
          companyName: values.companyName,
          logo: values.logo ?? null,
          termsConditions: values.termsConditions ?? null,
          paymentDetails: values.paymentDetails ?? null,
        }),
      );
    }
    onFinish(values);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file");
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("File size should not exceed 2MB");
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue("logo", reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setValue("logo", null, { shouldValidate: true });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Company Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your company information and preferences</p>
      </div>

      <form onSubmit={handleSubmit(handleSave as any)} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Basic information about your company</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="companyName"
                {...register("companyName", {
                  required: "Company name is required",
                })}
                placeholder="Enter company name"
              />
              {errors.companyName && <p className="text-sm text-destructive">{String(errors.companyName.message)}</p>}
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label htmlFor="logo">Company Logo</Label>
              <input type="hidden" {...register("logo")} />
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted overflow-hidden relative">
                  {logo ? (
                    <>
                      <img src={logo} alt="Company logo" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90">
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a square logo (recommended: 512x512px). PNG or JPG format. Max 2MB.
                  </p>
                  {logo && <p className="text-xs text-green-600">Logo uploaded successfully. Save changes to apply.</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Regional Settings</CardTitle>
            <CardDescription>Configure currency, tax, and timezone preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">
                  Currency <span className="text-destructive">*</span>
                </Label>
                <Select value={currency} onValueChange={(value) => setValue("currency", value as any)}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.currency && <p className="text-sm text-destructive">{String(errors.currency.message)}</p>}
              </div>

              {/* Tax Rate */}
              <div className="space-y-2">
                <Label htmlFor="taxRate">
                  Default Tax Rate (%) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register("taxRate", {
                    required: "Tax rate is required",
                    valueAsNumber: true,
                    min: { value: 0, message: "Tax rate must be 0 or greater" },
                    max: { value: 100, message: "Tax rate must be 100 or less" },
                  })}
                  placeholder="10.00"
                />
                {errors.taxRate && <p className="text-sm text-destructive">{String(errors.taxRate.message)}</p>}
                <p className="text-xs text-muted-foreground">This tax rate will be applied to quotes by default</p>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">
                Timezone <span className="text-destructive">*</span>
              </Label>
              <Select value={timezone} onValueChange={(value) => setValue("timezone", value)}>
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.timezone && <p className="text-sm text-destructive">{String(errors.timezone.message)}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Quote Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Quote Settings</CardTitle>
            <CardDescription>Customize the terms and payment details shown on quotes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="termsConditions">Terms &amp; Conditions</Label>
              <Textarea
                id="termsConditions"
                {...register("termsConditions")}
                placeholder="Enter your terms and conditions"
                className="min-h-[120px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDetails">Payment Details</Label>
              <Textarea
                id="paymentDetails"
                {...register("paymentDetails")}
                placeholder="Enter payment instructions (bank name, account number, etc.)"
                className="min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Business Contact Information</CardTitle>
            <CardDescription>Contact details displayed on quotes and invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">
                Business Address <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="address"
                {...register("address", {
                  required: "Business address is required",
                })}
                placeholder="Enter your business address"
                rows={3}
              />
              {errors.address && <p className="text-sm text-destructive">{String(errors.address.message)}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone", {
                    required: "Phone number is required",
                  })}
                  placeholder="+1-555-0100"
                />
                {errors.phone && <p className="text-sm text-destructive">{String(errors.phone.message)}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email", {
                    required: "Email address is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  })}
                  placeholder="contact@company.com"
                />
                {errors.email && <p className="text-sm text-destructive">{String(errors.email.message)}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4">
          <Button type="submit" disabled={formLoading}>
            {formLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
};
