import { useState, useRef, useCallback } from "react";
import { useShow, useUpdate, useDelete, useTable, HttpError } from "@refinedev/core";
import { useCurrency } from "@crm/hooks/use-currency";
import { useParams, useNavigate } from "react-router";
import dayjs from "dayjs";
import { supabaseClient } from "@crm/lib/supabase";
import {
  ArrowLeft,
  StoreIcon,
  MapPin,
  Mail,
  Phone,
  Edit2,
  Save,
  X,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  ImageIcon,
  Sparkles,
  Trash2,
  AlertTriangle,
  Upload,
  CreditCard,
  Building2,
  Percent,
  Banknote,
  Eye,
  EyeOff,
  Palette,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Switch } from "@crm/components/ui/switch";
import { Separator } from "@crm/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@crm/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@crm/components/ui/table";

import type { IStore, IProduct, ICourier, IOrder } from "@crm/types/finefoods";

export default function StoresEdit() {
  const { format } = useCurrency();
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const { query: queryResult } = useShow<IStore, HttpError>({
    resource: "stores",
    id,
  });

  const { data, isLoading } = queryResult;
  const store = data?.data;

  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [gsm, setGsm] = useState("");
  const [isActive, setIsActive] = useState(true);

  // State for form fields
  const [address, setAddress] = useState("");

  // Hero settings state
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroBadgeText, setHeroBadgeText] = useState("");
  const [heroCtaText, setHeroCtaText] = useState("");
  const [heroCtaLink, setHeroCtaLink] = useState("");
  const [heroRatingText, setHeroRatingText] = useState("");
  const [heroTypewriterWords, setHeroTypewriterWords] = useState<string[]>([]);
  const [heroTypewriterInput, setHeroTypewriterInput] = useState("");
  const [heroProductIds, setHeroProductIds] = useState<string[]>([]);
  const [heroBanners, setHeroBanners] = useState<string[]>([]);
  const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [heroUploadProgress, setHeroUploadProgress] = useState("");
  const [bannerUploadProgress, setBannerUploadProgress] = useState("");
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  // Logo state
  const [logoLightUrl, setLogoLightUrl] = useState("");
  const [logoDarkUrl, setLogoDarkUrl] = useState("");
  const [isUploadingLogoLight, setIsUploadingLogoLight] = useState(false);
  const [isUploadingLogoDark, setIsUploadingLogoDark] = useState(false);
  const [logoLightUploadProgress, setLogoLightUploadProgress] = useState("");
  const [logoDarkUploadProgress, setLogoDarkUploadProgress] = useState("");
  const logoLightFileInputRef = useRef<HTMLInputElement>(null);
  const logoDarkFileInputRef = useRef<HTMLInputElement>(null);

  // Payment settings state
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankSortCode, setBankSortCode] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankReferencePrefix, setBankReferencePrefix] = useState("ORD");
  const [showStripeSecret, setShowStripeSecret] = useState(false);

  // Tax settings state
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [taxLabel, setTaxLabel] = useState("VAT");

  // Branding settings state
  const [brandPrimary, setBrandPrimary] = useState("");
  const [brandSecondary, setBrandSecondary] = useState("");
  const [brandAccent, setBrandAccent] = useState("");
  const [brandBackground, setBrandBackground] = useState("");
  const [brandForeground, setBrandForeground] = useState("");
  const [brandMuted, setBrandMuted] = useState("");
  const [brandSchemeName, setBrandSchemeName] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const { mutate: updateStore } = useUpdate();
  const { mutate: deleteStore } = useDelete();

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch products for this store (products that belong to this user)
  const {
    tableQuery: productTableQuery,
  } = useTable<IProduct, HttpError>({
    resource: "products",
    pagination: { pageSize: 10 },
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  }) as any;

  const products = (productTableQuery?.data?.data ?? []) as IProduct[];

  // Fetch couriers assigned to this store
  const {
    tableQuery: courierTableQuery,
  } = useTable<ICourier, HttpError>({
    resource: "couriers",
    pagination: { pageSize: 5 },
    filters: {
      initial: id ? [{ field: "storeId", operator: "eq", value: id }] : [],
    },
  }) as any;

  const couriers = (courierTableQuery?.data?.data ?? []) as ICourier[];

  // Fetch orders for this store to check if delete is allowed
  const {
    tableQuery: orderTableQuery,
  } = useTable<IOrder, HttpError>({
    resource: "orders",
    pagination: { pageSize: 1000 },
    filters: {
      initial: id ? [{ field: "storeId", operator: "eq", value: id }] : [],
    },
  }) as any;

  const orders = (orderTableQuery?.data?.data ?? []) as IOrder[];
  const pendingOrders = orders.filter(
    (o) => o.status !== "Delivered" && o.status !== "Cancelled"
  );
  const canDelete = pendingOrders.length === 0;

  const startEditing = () => {
    if (store) {
      setTitle(store.title);
      setEmail(store.email);
      setGsm(store.gsm);
      setAddress(store.address || "");
      setIsActive(store.isActive);
      setHeroImageUrl(store.heroImageUrl || "");
      setLogoLightUrl(store.logoLightUrl || "");
      setLogoDarkUrl(store.logoDarkUrl || "");
      setHeroTitle(store.heroTitle || "");
      setHeroSubtitle(store.heroSubtitle || "");
      setHeroBadgeText(store.heroBadgeText || "");
      setHeroCtaText(store.heroCtaText || "");
      setHeroCtaLink(store.heroCtaLink || "");
      setHeroRatingText(store.heroRatingText || "");
      setHeroTypewriterWords(store.heroTypewriterWords || []);
      setHeroTypewriterInput("");
      setHeroProductIds(store.heroProductIds || []);
      setHeroBanners(store.heroBanners || []);
      setStripePublishableKey(store.stripePublishableKey || "");
      setStripeSecretKey((store as any).stripeSecretKey || "");
      setBankName(store.bankName || "");
      setBankAccountName(store.bankAccountName || "");
      setBankAccountNumber(store.bankAccountNumber || "");
      setBankSortCode(store.bankSortCode || "");
      setBankIban(store.bankIban || "");
      setBankReferencePrefix(store.bankReferencePrefix || "ORD");
      setTaxEnabled(store.taxEnabled || false);
      setTaxRate(store.taxRate || 0);
      setTaxLabel(store.taxLabel || "VAT");
      setBrandPrimary(store.brandPrimary || "");
      setBrandSecondary(store.brandSecondary || "");
      setBrandAccent(store.brandAccent || "");
      setBrandBackground(store.brandBackground || "");
      setBrandForeground(store.brandForeground || "");
      setBrandMuted(store.brandMuted || "");
      setBrandSchemeName(store.brandSchemeName || "");
      setShowStripeSecret(false);
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!store) return;
    setIsSaving(true);
    updateStore(
      {
        resource: "stores",
        id: store.id,
        values: {
          title,
          email,
          gsm,
          address,
          isActive,
          logoLightUrl: logoLightUrl || null,
          logoDarkUrl: logoDarkUrl || null,
          heroImageUrl: heroImageUrl || null,
          heroTitle: heroTitle || null,
          heroSubtitle: heroSubtitle || null,
          heroBadgeText: heroBadgeText || null,
          heroCtaText: heroCtaText || null,
          heroCtaLink: heroCtaLink || null,
          heroRatingText: heroRatingText || null,
          heroTypewriterWords: heroTypewriterWords.length > 0 ? heroTypewriterWords : null,
          heroProductIds: heroProductIds.length > 0 ? heroProductIds : null,
          heroBanners: heroBanners.length > 0 ? heroBanners : null,
          stripePublishableKey: stripePublishableKey || null,
          stripeSecretKey: stripeSecretKey || null,
          bankName: bankName || null,
          bankAccountName: bankAccountName || null,
          bankAccountNumber: bankAccountNumber || null,
          bankSortCode: bankSortCode || null,
          bankIban: bankIban || null,
          bankReferencePrefix: bankReferencePrefix || "ORD",
          taxEnabled,
          taxRate: taxRate || 0,
          taxLabel: taxLabel || "VAT",
          brandPrimary: brandPrimary || null,
          brandSecondary: brandSecondary || null,
          brandAccent: brandAccent || null,
          brandBackground: brandBackground || null,
          brandForeground: brandForeground || null,
          brandMuted: brandMuted || null,
          brandSchemeName: brandSchemeName || null,
        },
      },
      {
        onSuccess: () => { setIsEditing(false); setIsSaving(false); },
        onError: () => setIsSaving(false),
      }
    );
  };

  const handleDelete = () => {
    if (!store || !canDelete) return;
    deleteStore(
      { resource: "stores", id: store.id },
      { onSuccess: () => navigate("/stores") }
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 animate-pulse bg-muted rounded" />
        <div className="h-64 animate-pulse bg-muted rounded-lg" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Store not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/stores")}>
          Back to Stores
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/stores")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{store.title}</h1>
            <p className="text-muted-foreground">Store Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={startEditing}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Store Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StoreIcon className="h-5 w-5" />
                Store Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Store Name</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={gsm} onChange={(e) => setGsm(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter store address"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Store Name</p>
                      <p className="font-medium">{store.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={store.isActive ? "default" : "secondary"} className="mt-1 gap-1">
                        {store.isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {store.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{store.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{store.gsm}</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{store.address || "—"}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Created {dayjs(store.createdAt).format("MMMM D, YYYY")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Store Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Store Logo
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload a light and dark version of your logo. The storefront will automatically pick the right one based on your brand colour.
              </p>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Light Logo */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Light Logo <span className="font-normal text-muted-foreground">(for dark backgrounds)</span></Label>
                    <div className="flex flex-col items-center gap-3 p-4 rounded-xl border bg-gray-900">
                      {logoLightUrl ? (
                        <div className="relative w-full h-24 flex items-center justify-center group">
                          <img
                            src={logoLightUrl}
                            alt="Light logo preview"
                            className="max-h-24 w-auto max-w-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => setLogoLightUrl("")}
                            className="absolute top-0 right-0 p-1 rounded-full bg-destructive/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-24 rounded-lg border border-dashed border-white/20 flex items-center justify-center">
                          <StoreIcon className="h-10 w-10 text-white/20" />
                        </div>
                      )}
                      <input
                        ref={logoLightFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploadingLogoLight(true);
                          setLogoLightUploadProgress("Uploading...");
                          try {
                            const { data: { user } } = await supabaseClient.auth.getUser();
                            if (!user) throw new Error("Not authenticated");
                            const ext = file.name.split(".").pop() || "png";
                            const fileName = `${user.id}/logo-light/${crypto.randomUUID()}.${ext}`;
                            const { error: uploadError } = await supabaseClient.storage
                              .from("product-images")
                              .upload(fileName, file, { contentType: file.type, upsert: false });
                            if (uploadError) throw uploadError;
                            const { data: urlData } = supabaseClient.storage
                              .from("product-images")
                              .getPublicUrl(fileName);
                            setLogoLightUrl(urlData.publicUrl);
                            setLogoLightUploadProgress("Uploaded!");
                            setTimeout(() => setLogoLightUploadProgress(""), 2500);
                          } catch (err) {
                            console.error("Light logo upload failed:", err);
                            setLogoLightUploadProgress("Upload failed. Try again.");
                            setTimeout(() => setLogoLightUploadProgress(""), 3000);
                          } finally {
                            setIsUploadingLogoLight(false);
                            if (logoLightFileInputRef.current) logoLightFileInputRef.current.value = "";
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isUploadingLogoLight}
                        onClick={() => logoLightFileInputRef.current?.click()}
                        className="gap-2 w-full"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploadingLogoLight ? "Uploading..." : "Upload Light Logo"}
                      </Button>
                      {logoLightUploadProgress && (
                        <p className="text-xs text-white/60">{logoLightUploadProgress}</p>
                      )}
                    </div>
                  </div>

                  {/* Dark Logo */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Dark Logo <span className="font-normal text-muted-foreground">(for light backgrounds)</span></Label>
                    <div className="flex flex-col items-center gap-3 p-4 rounded-xl border bg-white">
                      {logoDarkUrl ? (
                        <div className="relative w-full h-24 flex items-center justify-center group">
                          <img
                            src={logoDarkUrl}
                            alt="Dark logo preview"
                            className="max-h-24 w-auto max-w-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => setLogoDarkUrl("")}
                            className="absolute top-0 right-0 p-1 rounded-full bg-destructive/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-24 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                          <StoreIcon className="h-10 w-10 text-muted-foreground/20" />
                        </div>
                      )}
                      <input
                        ref={logoDarkFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploadingLogoDark(true);
                          setLogoDarkUploadProgress("Uploading...");
                          try {
                            const { data: { user } } = await supabaseClient.auth.getUser();
                            if (!user) throw new Error("Not authenticated");
                            const ext = file.name.split(".").pop() || "png";
                            const fileName = `${user.id}/logo-dark/${crypto.randomUUID()}.${ext}`;
                            const { error: uploadError } = await supabaseClient.storage
                              .from("product-images")
                              .upload(fileName, file, { contentType: file.type, upsert: false });
                            if (uploadError) throw uploadError;
                            const { data: urlData } = supabaseClient.storage
                              .from("product-images")
                              .getPublicUrl(fileName);
                            setLogoDarkUrl(urlData.publicUrl);
                            setLogoDarkUploadProgress("Uploaded!");
                            setTimeout(() => setLogoDarkUploadProgress(""), 2500);
                          } catch (err) {
                            console.error("Dark logo upload failed:", err);
                            setLogoDarkUploadProgress("Upload failed. Try again.");
                            setTimeout(() => setLogoDarkUploadProgress(""), 3000);
                          } finally {
                            setIsUploadingLogoDark(false);
                            if (logoDarkFileInputRef.current) logoDarkFileInputRef.current.value = "";
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUploadingLogoDark}
                        onClick={() => logoDarkFileInputRef.current?.click()}
                        className="gap-2 w-full"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploadingLogoDark ? "Uploading..." : "Upload Dark Logo"}
                      </Button>
                      {logoDarkUploadProgress && (
                        <p className="text-xs text-muted-foreground">{logoDarkUploadProgress}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Light Logo</p>
                    <div className="flex items-center justify-center h-24 rounded-xl bg-gray-900 border p-3">
                      {store?.logoLightUrl ? (
                        <img src={store.logoLightUrl} alt="Light logo" className="max-h-20 w-auto object-contain" />
                      ) : (
                        <StoreIcon className="h-8 w-8 text-white/20" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Dark Logo</p>
                    <div className="flex items-center justify-center h-24 rounded-xl bg-white border p-3">
                      {store?.logoDarkUrl ? (
                        <img src={store.logoDarkUrl} alt="Dark logo" className="max-h-20 w-auto object-contain" />
                      ) : (
                        <StoreIcon className="h-8 w-8 text-muted-foreground/20" />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hero Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Storefront Hero Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  {/* Hero Image Upload */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Hero Image
                    </Label>
                    <div className="flex items-start gap-4">
                      {heroImageUrl ? (
                        <div className="relative w-28 h-36 rounded-lg overflow-hidden border bg-muted flex-shrink-0 group">
                          <img
                            src={heroImageUrl}
                            alt="Hero preview"
                            className="w-full h-full object-contain object-bottom"
                          />
                          <button
                            type="button"
                            onClick={() => setHeroImageUrl("")}
                            className="absolute top-1 right-1 p-1 rounded-full bg-destructive/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-28 h-36 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <input
                          ref={heroFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploadingHeroImage(true);
                            setHeroUploadProgress("Uploading...");
                            try {
                              const { data: { user } } = await supabaseClient.auth.getUser();
                              if (!user) throw new Error("Not authenticated");
                              const ext = file.name.split(".").pop() || "png";
                              const fileName = `${user.id}/hero/${crypto.randomUUID()}.${ext}`;
                              const { error: uploadError } = await supabaseClient.storage
                                .from("product-images")
                                .upload(fileName, file, { contentType: file.type, upsert: false });
                              if (uploadError) throw uploadError;
                              const { data: urlData } = supabaseClient.storage
                                .from("product-images")
                                .getPublicUrl(fileName);
                              setHeroImageUrl(urlData.publicUrl);
                              setHeroUploadProgress("Uploaded!");
                              setTimeout(() => setHeroUploadProgress(""), 2500);
                            } catch (err) {
                              console.error("Hero image upload failed:", err);
                              setHeroUploadProgress("Upload failed. Try again.");
                              setTimeout(() => setHeroUploadProgress(""), 3000);
                            } finally {
                              setIsUploadingHeroImage(false);
                              if (heroFileInputRef.current) heroFileInputRef.current.value = "";
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploadingHeroImage}
                          onClick={() => heroFileInputRef.current?.click()}
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          {isUploadingHeroImage ? "Uploading..." : "Upload Image"}
                        </Button>
                        {heroUploadProgress && (
                          <p className="text-xs text-muted-foreground">{heroUploadProgress}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Upload a PNG image (ideally a transparent-background person/product photo)
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Featured Products (select up to 4)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      These products will be displayed as floating cards in the hero section.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                      {products.map((product) => {
                        const isSelected = heroProductIds.includes(product.id);
                        const isDisabled = !isSelected && heroProductIds.length >= 4;
                        return (
                          <button
                            key={product.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              if (isSelected) {
                                setHeroProductIds((prev) =>
                                  prev.filter((pid) => pid !== product.id)
                                );
                              } else {
                                setHeroProductIds((prev) => [...prev, product.id]);
                              }
                            }}
                            className={`flex items-center gap-3 p-2 rounded-lg border text-left transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : isDisabled
                                ? "opacity-50 cursor-not-allowed border-border"
                                : "border-border hover:bg-muted/50"
                            }`}
                          >
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-10 w-10 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{format(Number(product.price))}</p>
                            </div>
                            <div className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 ${
                              isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                            }`}>
                              {isSelected && (
                                <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {heroProductIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {heroProductIds.length}/4 products selected
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    {store.heroImageUrl ? (
                      <div className="w-20 h-24 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                        <img
                          src={store.heroImageUrl}
                          alt="Hero"
                          className="w-full h-full object-contain object-bottom"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-24 rounded-lg border bg-muted flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Hero Image</p>
                      <p className="text-sm font-medium">{store.heroImageUrl ? "Custom image set" : "Using default"}</p>
                    </div>
                  </div>
                  {store.heroBanners && store.heroBanners.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Banner Carousel ({store.heroBanners.length})</p>
                        <div className="grid grid-cols-4 gap-2">
                          {store.heroBanners.map((url, i) => (
                            <div key={i} className="aspect-square rounded-lg overflow-hidden border bg-muted">
                              <img src={url} alt={`Banner ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {store.heroProductIds && store.heroProductIds.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Featured Products ({store.heroProductIds.length})</p>
                        <div className="flex gap-2 flex-wrap">
                          {store.heroProductIds.map((pid) => {
                            const product = products.find((p) => p.id === pid);
                            return product ? (
                              <div key={pid} className="flex items-center gap-2 border rounded-lg px-2 py-1">
                                {product.imageUrl && (
                                  <img src={product.imageUrl} alt="" className="h-6 w-6 rounded object-cover" />
                                )}
                                <span className="text-xs font-medium">{product.name}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Branding Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Branding & Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isEditing ? (
                <>
                  {/* Suggested Color Schemes */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Suggested Color Schemes</Label>
                    <p className="text-xs text-muted-foreground">Click a scheme to apply it instantly, then customise individual colors below.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {[
                        { name: "Modern Minimal", primary: "#18181b", secondary: "#f4f4f5", accent: "#2563eb", background: "#ffffff", foreground: "#18181b", muted: "#71717a" },
                        { name: "Ocean Blue", primary: "#0369a1", secondary: "#e0f2fe", accent: "#0ea5e9", background: "#f0f9ff", foreground: "#1e293b", muted: "#64748b" },
                        { name: "Forest Green", primary: "#15803d", secondary: "#dcfce7", accent: "#22c55e", background: "#f0fdf4", foreground: "#1e293b", muted: "#64748b" },
                        { name: "Royal Purple", primary: "#7c3aed", secondary: "#ede9fe", accent: "#a78bfa", background: "#faf5ff", foreground: "#1e1b2e", muted: "#6b7280" },
                        { name: "Warm Sunset", primary: "#ea580c", secondary: "#fff7ed", accent: "#f97316", background: "#fffbeb", foreground: "#1c1917", muted: "#78716c" },
                        { name: "Rose Gold", primary: "#be185d", secondary: "#fce7f3", accent: "#ec4899", background: "#fdf2f8", foreground: "#1e1e1e", muted: "#6b7280" },
                        { name: "Slate Dark", primary: "#e2e8f0", secondary: "#334155", accent: "#38bdf8", background: "#0f172a", foreground: "#f1f5f9", muted: "#94a3b8" },
                        { name: "Luxe Gold", primary: "#b45309", secondary: "#fef3c7", accent: "#d97706", background: "#fffbeb", foreground: "#1c1917", muted: "#78716c" },
                      ].map((scheme) => (
                        <button
                          key={scheme.name}
                          type="button"
                          onClick={() => {
                            setBrandPrimary(scheme.primary);
                            setBrandSecondary(scheme.secondary);
                            setBrandAccent(scheme.accent);
                            setBrandBackground(scheme.background);
                            setBrandForeground(scheme.foreground);
                            setBrandMuted(scheme.muted);
                            setBrandSchemeName(scheme.name);
                          }}
                          className={`group relative rounded-xl border-2 p-3 text-left transition-all hover:shadow-md ${
                            brandSchemeName === scheme.name
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-muted hover:border-foreground/20"
                          }`}
                        >
                          <div className="flex gap-1 mb-2">
                            {[scheme.primary, scheme.secondary, scheme.accent, scheme.background, scheme.foreground].map((color, i) => (
                              <div
                                key={i}
                                className="h-5 w-5 rounded-full border border-black/10"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <p className="text-xs font-medium truncate">{scheme.name}</p>
                          {brandSchemeName === scheme.name && (
                            <div className="absolute top-1.5 right-1.5">
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Custom Color Pickers */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Custom Colors</Label>
                    <p className="text-xs text-muted-foreground">Fine-tune each color. Changes override the selected scheme.</p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        { label: "Primary", value: brandPrimary, setter: setBrandPrimary, desc: "Buttons, links, active elements" },
                        { label: "Secondary", value: brandSecondary, setter: setBrandSecondary, desc: "Cards, subtle backgrounds" },
                        { label: "Accent", value: brandAccent, setter: setBrandAccent, desc: "Highlights, badges, hover states" },
                        { label: "Background", value: brandBackground, setter: setBrandBackground, desc: "Page background color" },
                        { label: "Foreground", value: brandForeground, setter: setBrandForeground, desc: "Main text color" },
                        { label: "Muted", value: brandMuted, setter: setBrandMuted, desc: "Subtle text, borders" },
                      ].map(({ label, value, setter, desc }) => (
                        <div key={label} className="space-y-1.5">
                          <Label className="text-xs font-medium">{label}</Label>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input
                                type="color"
                                value={value || "#000000"}
                                onChange={e => { setter(e.target.value); setBrandSchemeName("Custom"); }}
                                className="h-9 w-9 rounded-lg border cursor-pointer appearance-none bg-transparent p-0.5"
                              />
                            </div>
                            <Input
                              value={value}
                              onChange={e => { setter(e.target.value); setBrandSchemeName("Custom"); }}
                              placeholder="#000000"
                              className="font-mono text-xs h-9"
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">{desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Preview */}
                  {brandPrimary && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Preview</Label>
                        <div
                          className="rounded-xl border overflow-hidden"
                          style={{ backgroundColor: brandBackground || "#ffffff", color: brandForeground || "#000000" }}
                        >
                          {/* Preview navbar */}
                          <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: brandPrimary, color: brandSecondary || "#ffffff" }}>
                            <span className="text-sm font-bold">{store?.title || "Your Store"}</span>
                            <div className="flex gap-2">
                              <div className="h-6 w-12 rounded text-[10px] flex items-center justify-center font-medium" style={{ backgroundColor: brandAccent || brandPrimary, color: "#fff" }}>Shop</div>
                            </div>
                          </div>
                          {/* Preview body */}
                          <div className="p-4 space-y-3">
                            <div className="h-3 rounded-full w-3/4" style={{ backgroundColor: brandForeground || "#000", opacity: 0.7 }} />
                            <div className="h-3 rounded-full w-1/2" style={{ backgroundColor: brandMuted || "#999", opacity: 0.5 }} />
                            <div className="flex gap-2 mt-3">
                              <div className="h-8 px-3 rounded-lg text-xs flex items-center font-medium" style={{ backgroundColor: brandPrimary, color: brandSecondary || "#fff" }}>Add to Cart</div>
                              <div className="h-8 px-3 rounded-lg text-xs flex items-center font-medium border" style={{ borderColor: brandPrimary, color: brandPrimary }}>Wishlist</div>
                            </div>
                            {/* Product cards */}
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {[1, 2, 3].map(i => (
                                <div key={i} className="rounded-lg p-2 border" style={{ backgroundColor: brandSecondary || "#f5f5f5", borderColor: brandMuted || "#e5e5e5" }}>
                                  <div className="h-10 rounded mb-1.5" style={{ backgroundColor: brandMuted || "#e5e5e5" }} />
                                  <div className="h-2 rounded-full w-3/4 mb-1" style={{ backgroundColor: brandForeground || "#000", opacity: 0.5 }} />
                                  <div className="h-2 rounded-full w-1/2" style={{ backgroundColor: brandAccent || brandPrimary, opacity: 0.8 }} />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Clear branding */}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => {
                        setBrandPrimary("");
                        setBrandSecondary("");
                        setBrandAccent("");
                        setBrandBackground("");
                        setBrandForeground("");
                        setBrandMuted("");
                        setBrandSchemeName("");
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Reset to Default
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {store?.brandSchemeName ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{store.brandSchemeName}</Badge>
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {[store.brandPrimary, store.brandSecondary, store.brandAccent, store.brandBackground, store.brandForeground, store.brandMuted].filter(Boolean).map((color, i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className="h-8 w-8 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                            <span className="text-[10px] text-muted-foreground font-mono">{color}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Default</Badge>
                      <span className="text-xs text-muted-foreground">Using system default colors</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment & Tax Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment & Tax Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isEditing ? (
                <>
                  {/* Stripe Settings */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Card Payments (Stripe)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Enter your Stripe API keys to accept card payments. Get them from{" "}
                      <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary underline">dashboard.stripe.com</a>.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="stripePublishableKey">Publishable Key</Label>
                        <Input
                          id="stripePublishableKey"
                          placeholder="pk_live_..."
                          value={stripePublishableKey}
                          onChange={e => setStripePublishableKey(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stripeSecretKey">Secret Key</Label>
                        <div className="relative">
                          <Input
                            id="stripeSecretKey"
                            type={showStripeSecret ? "text" : "password"}
                            placeholder="sk_live_..."
                            value={stripeSecretKey}
                            onChange={e => setStripeSecretKey(e.target.value)}
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowStripeSecret(!showStripeSecret)}
                          >
                            {showStripeSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Bank Transfer Settings */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Bank Transfer
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Customers can pay via bank transfer. These details will be shown at checkout.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          placeholder="e.g. Barclays"
                          value={bankName}
                          onChange={e => setBankName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankAccountName">Account Name</Label>
                        <Input
                          id="bankAccountName"
                          placeholder="e.g. My Store Ltd"
                          value={bankAccountName}
                          onChange={e => setBankAccountName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankAccountNumber">Account Number</Label>
                        <Input
                          id="bankAccountNumber"
                          placeholder="e.g. 12345678"
                          value={bankAccountNumber}
                          onChange={e => setBankAccountNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankSortCode">Sort Code</Label>
                        <Input
                          id="bankSortCode"
                          placeholder="e.g. 12-34-56"
                          value={bankSortCode}
                          onChange={e => setBankSortCode(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankIban">IBAN (optional)</Label>
                        <Input
                          id="bankIban"
                          placeholder="e.g. GB29NWBK60161331926819"
                          value={bankIban}
                          onChange={e => setBankIban(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankReferencePrefix">Payment Reference Prefix</Label>
                        <Input
                          id="bankReferencePrefix"
                          placeholder="e.g. ORD"
                          value={bankReferencePrefix}
                          onChange={e => setBankReferencePrefix(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Tax Settings */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Tax Settings
                    </h4>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Enable Tax</Label>
                        <p className="text-xs text-muted-foreground">
                          Add tax to customer orders at checkout
                        </p>
                      </div>
                      <Switch
                        checked={taxEnabled}
                        onCheckedChange={setTaxEnabled}
                      />
                    </div>
                    {taxEnabled && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="taxRate">Tax Rate (%)</Label>
                          <Input
                            id="taxRate"
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            placeholder="e.g. 20"
                            value={taxRate || ""}
                            onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="taxLabel">Tax Label</Label>
                          <Input
                            id="taxLabel"
                            placeholder="e.g. VAT, GST, Sales Tax"
                            value={taxLabel}
                            onChange={e => setTaxLabel(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {/* View mode */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Card Payments
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={store?.stripePublishableKey ? "default" : "secondary"}>
                        {store?.stripePublishableKey ? "Configured" : "Not configured"}
                      </Badge>
                      {store?.stripePublishableKey && (
                        <span className="text-xs text-muted-foreground">pk_...{store.stripePublishableKey.slice(-8)}</span>
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Bank Transfer
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={store?.bankName ? "default" : "secondary"}>
                        {store?.bankName ? "Configured" : "Not configured"}
                      </Badge>
                      {store?.bankName && (
                        <span className="text-xs text-muted-foreground">{store.bankName} - {store.bankAccountName}</span>
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Tax
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={store?.taxEnabled ? "default" : "secondary"}>
                        {store?.taxEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                      {store?.taxEnabled && (
                        <span className="text-xs text-muted-foreground">{store.taxRate}% {store.taxLabel}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products */}
          {products.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products ({products.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.slice(0, 10).map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-8 w-8 rounded object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-sm font-medium">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {format(Number(product.price))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Couriers */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Couriers ({couriers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {couriers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No couriers assigned
                </p>
              ) : (
                <div className="space-y-3">
                  {couriers.map((courier) => (
                    <div
                      key={courier.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      {courier.avatarUrl ? (
                        <img
                          src={courier.avatarUrl}
                          alt={courier.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Truck className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {courier.name} {courier.surname}
                        </p>
                        <p className="text-xs text-muted-foreground">{courier.gsm}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {courier.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Store Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {canDelete ? (
                <Trash2 className="h-5 w-5 text-destructive" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              {canDelete ? "Delete Store" : "Cannot Delete Store"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {canDelete ? (
                <>
                  Are you sure you want to delete <strong>{store.title}</strong>?
                  This action cannot be undone. All store data will be permanently removed.
                </>
              ) : (
                <>
                  <strong>{store.title}</strong> has{" "}
                  <strong>{pendingOrders.length} active order{pendingOrders.length !== 1 ? "s" : ""}</strong>{" "}
                  ({pendingOrders.map((o) => o.status).filter((v, i, a) => a.indexOf(v) === i).join(", ")}).
                  All orders must be <strong>Delivered</strong> or <strong>Cancelled</strong> before the store can be deleted.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {canDelete ? "Cancel" : "Close"}
            </AlertDialogCancel>
            {canDelete && (
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Store
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
