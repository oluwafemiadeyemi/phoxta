import { useState, useEffect, useCallback } from "react";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Separator } from "@crm/components/ui/separator";
import { Badge } from "@crm/components/ui/badge";
import { cn } from "@crm/lib/utils";
import {
  User,
  Package,
  Heart,
  LogOut,
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Loader2,
  Save,
  Eye,
  ArrowLeft,
  Calendar,
  Hash,
  CreditCard,
} from "lucide-react";
import type { StoreCustomer } from "./auth-modal";

interface AccountDashboardProps {
  customer: StoreCustomer;
  storeName: string;
  onBack: () => void;
  onSignOut: () => void;
  onCustomerUpdate: (customer: StoreCustomer) => void;
}

type AccountTab = "overview" | "orders" | "profile" | "wishlist";

interface OrderItem {
  id: string;
  product_name: string;
  product_image_url: string | null;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: number;
  amount: number;
  status: string;
  store_name: string;
  notes: string;
  created_at: string;
  items: OrderItem[];
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(price);
}

function getStatusConfig(status: string) {
  const s = status.toLowerCase();
  if (s === "delivered" || s === "completed")
    return {
      icon: CheckCircle2,
      color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      dot: "bg-green-500",
    };
  if (s === "shipped" || s === "in transit")
    return {
      icon: Truck,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      dot: "bg-blue-500",
    };
  if (s === "cancelled" || s === "refunded")
    return {
      icon: XCircle,
      color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      dot: "bg-red-500",
    };
  if (s === "processing")
    return {
      icon: Clock,
      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      dot: "bg-yellow-500",
    };
  // Pending
  return {
    icon: Clock,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    dot: "bg-orange-500",
  };
}

const tabs: { key: AccountTab; label: string; icon: typeof User }[] = [
  { key: "overview", label: "Overview", icon: User },
  { key: "orders", label: "Orders", icon: Package },
  { key: "profile", label: "Profile", icon: Mail },
  { key: "wishlist", label: "Wishlist", icon: Heart },
];

export function StorefrontAccountDashboard({
  customer,
  storeName,
  onBack,
  onSignOut,
  onCustomerUpdate,
}: AccountDashboardProps) {
  const [activeTab, setActiveTab] = useState<AccountTab>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Profile edit
  const [editFirst, setEditFirst] = useState(customer.first_name);
  const [editLast, setEditLast] = useState(customer.last_name);
  const [editPhone, setEditPhone] = useState(customer.gsm);
  const [editAddress, setEditAddress] = useState(customer.address);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/store/orders");
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/store/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirst,
          lastName: editLast,
          phone: editPhone,
          address: editAddress,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMsg("Profile updated successfully!");
        onCustomerUpdate(data.customer);
      } else {
        setProfileMsg(data.error || "Update failed");
      }
    } catch {
      setProfileMsg("Something went wrong");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/store/auth/signout", { method: "POST" });
    } catch {
      // ignore
    }
    onSignOut();
  };

  // Stats
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.amount), 0);
  const pendingOrders = orders.filter(
    (o) => o.status.toLowerCase() === "pending",
  ).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b bg-background/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {storeName}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
              {customer.first_name[0]}
              {customer.last_name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                Welcome, {customer.first_name}!
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your account, orders, and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 mb-8 bg-muted rounded-lg p-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSelectedOrder(null);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.key === "orders" && totalOrders > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-[10px]"
                  >
                    {totalOrders}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl border bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                </div>
                <p className="text-3xl font-bold">{totalOrders}</p>
              </div>
              <div className="p-5 rounded-xl border bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                </div>
                <p className="text-3xl font-bold">{formatPrice(totalSpent)}</p>
              </div>
              <div className="p-5 rounded-xl border bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
                <p className="text-3xl font-bold">{pendingOrders}</p>
              </div>
            </div>

            {/* Recent orders */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recent Orders</h2>
                {orders.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("orders")}
                  >
                    View all
                  </Button>
                )}
              </div>
              {loadingOrders ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 border rounded-xl bg-card">
                  <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="font-medium">No orders yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your order history will appear here
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={onBack}
                  >
                    Start Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 3).map((order) => {
                    const cfg = getStatusConfig(order.status);
                    return (
                      <button
                        key={order.id}
                        onClick={() => {
                          setSelectedOrder(order);
                          setActiveTab("orders");
                        }}
                        className="w-full text-left p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              Order #{order.order_number}
                            </span>
                          </div>
                          <Badge className={cn("text-xs", cfg.color)}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>
                            {new Date(order.created_at).toLocaleDateString()} ·{" "}
                            {order.items.length} item
                            {order.items.length !== 1 ? "s" : ""}
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatPrice(Number(order.amount))}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick profile info */}
            <div className="p-5 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Account Info</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("profile")}
                >
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  {customer.first_name} {customer.last_name}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {customer.email}
                </div>
                {customer.gsm && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {customer.gsm}
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {customer.address}
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Member since{" "}
                  {new Date(customer.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div>
            {selectedOrder ? (
              /* Order detail view */
              <div className="space-y-6">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to orders
                </button>

                <div className="p-6 rounded-xl border bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold">
                        Order #{selectedOrder.order_number}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Placed on{" "}
                        {new Date(selectedOrder.created_at).toLocaleDateString(
                          "en-GB",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        "text-sm px-3 py-1",
                        getStatusConfig(selectedOrder.status).color,
                      )}
                    >
                      {selectedOrder.status}
                    </Badge>
                  </div>

                  <Separator className="my-4" />

                  {/* Order items */}
                  <h3 className="font-semibold mb-3">
                    Items ({selectedOrder.items.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                      >
                        {item.product_image_url ? (
                          <img
                            src={item.product_image_url}
                            alt={item.product_name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {item.product_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold">
                          {formatPrice(Number(item.price) * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  {/* Order total */}
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatPrice(Number(selectedOrder.amount))}</span>
                  </div>

                  {selectedOrder.notes && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
                      <p className="font-medium mb-1">Notes</p>
                      <p className="text-muted-foreground">
                        {selectedOrder.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Orders list */
              <div>
                <h2 className="text-xl font-bold mb-4">Order History</h2>
                {loadingOrders ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16 border rounded-xl bg-card">
                    <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                    <p className="text-lg font-medium">No orders yet</p>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      When you place an order it will show up here
                    </p>
                    <Button onClick={onBack}>Browse Products</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => {
                      const cfg = getStatusConfig(order.status);
                      const StatusIcon = cfg.icon;
                      return (
                        <button
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className="w-full text-left p-5 rounded-xl border bg-card hover:shadow-md transition-all group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-bold">
                                  #{order.order_number}
                                </span>
                                <Badge className={cn("text-xs", cfg.color)}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {order.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(
                                  order.created_at,
                                ).toLocaleDateString("en-GB", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold">
                                {formatPrice(Number(order.amount))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {order.items.length} item
                                {order.items.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>

                          {/* Product thumbnails */}
                          {order.items.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              {order.items.slice(0, 4).map((item) =>
                                item.product_image_url ? (
                                  <img
                                    key={item.id}
                                    src={item.product_image_url}
                                    alt={item.product_name}
                                    className="w-10 h-10 rounded-md object-cover border"
                                  />
                                ) : (
                                  <div
                                    key={item.id}
                                    className="w-10 h-10 rounded-md bg-muted border flex items-center justify-center"
                                  >
                                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                ),
                              )}
                              {order.items.length > 4 && (
                                <div className="w-10 h-10 rounded-md bg-muted border flex items-center justify-center text-xs font-medium text-muted-foreground">
                                  +{order.items.length - 4}
                                </div>
                              )}
                              <Eye className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="max-w-lg">
            <h2 className="text-xl font-bold mb-6">Edit Profile</h2>

            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                  {customer.first_name[0]}
                  {customer.last_name[0]}
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    {customer.first_name} {customer.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {customer.email}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={editFirst}
                    onChange={(e) => setEditFirst(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={editLast}
                    onChange={(e) => setEditLast(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={customer.email}
                    disabled
                    className="pl-10 bg-muted cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone number"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Delivery Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Your delivery address"
                    className="pl-10"
                  />
                </div>
              </div>

              {profileMsg && (
                <div
                  className={cn(
                    "p-3 rounded-lg text-sm flex items-center gap-2",
                    profileMsg.includes("success")
                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {profileMsg}
                </div>
              )}

              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full"
              >
                {savingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            <Separator className="my-8" />

            {/* Account info */}
            <div className="space-y-4 text-sm">
              <h3 className="font-semibold text-base">Account Details</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Member since</span>
                  <span className="font-medium">
                    {new Date(customer.created_at).toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Total orders</span>
                  <span className="font-medium">{totalOrders}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Lifetime spend</span>
                  <span className="font-medium">
                    {formatPrice(totalSpent)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WISHLIST TAB */}
        {activeTab === "wishlist" && (
          <div>
            <h2 className="text-xl font-bold mb-4">My Wishlist</h2>
            <div className="text-center py-16 border rounded-xl bg-card">
              <Heart className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-lg font-medium">Your wishlist is empty</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Save items you love for later
              </p>
              <Button onClick={onBack}>Browse Products</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
