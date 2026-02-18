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

                  {/* Banner Carousel Upload */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Banner Carousel
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Upload square banner images for the hero carousel. They will auto-rotate for your customers.
                    </p>

                    {/* Existing banners */}
                    {heroBanners.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {heroBanners.map((url, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                            <img
                              src={url}
                              alt={`Banner ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setHeroBanners((prev) => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 p-1 rounded-full bg-destructive/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                              {idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <input
                      ref={bannerFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingBanner(true);
                        setBannerUploadProgress("Uploading...");
                        try {
                          const { data: { user } } = await supabaseClient.auth.getUser();
                          if (!user) throw new Error("Not authenticated");
                          const ext = file.name.split(".").pop() || "png";
                          const fileName = `${user.id}/banners/${crypto.randomUUID()}.${ext}`;
                          const { error: uploadError } = await supabaseClient.storage
                            .from("product-images")
                            .upload(fileName, file, { contentType: file.type, upsert: false });
                          if (uploadError) throw uploadError;
                          const { data: urlData } = supabaseClient.storage
                            .from("product-images")
                            .getPublicUrl(fileName);
                          setHeroBanners((prev) => [...prev, urlData.publicUrl]);
                          setBannerUploadProgress("Uploaded!");
                          setTimeout(() => setBannerUploadProgress(""), 2500);
                        } catch (err) {
                          console.error("Banner upload failed:", err);
                          setBannerUploadProgress("Upload failed. Try again.");
                          setTimeout(() => setBannerUploadProgress(""), 3000);
                        } finally {
                          setIsUploadingBanner(false);
                          if (bannerFileInputRef.current) bannerFileInputRef.current.value = "";
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingBanner}
                      onClick={() => bannerFileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploadingBanner ? "Uploading..." : "Add Banner"}
                    </Button>
                    {bannerUploadProgress && (
                      <p className="text-xs text-muted-foreground">{bannerUploadProgress}</p>
                    )}
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
