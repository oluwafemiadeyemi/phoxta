import { useState, useEffect } from "react";
import {
  CreditCard,
  ShoppingBag,
  User,
  Mail,
  MapPin,
  Phone,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ClipboardList,
  Check,
} from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Separator } from "@crm/components/ui/separator";
import { Textarea } from "@crm/components/ui/textarea";
import { cn } from "@crm/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@crm/components/ui/dialog";
import { supabaseClient } from "@crm/lib/supabase";
import type { CartItem } from "../index";
import type { StoreCustomer } from "./auth-modal";

interface StorefrontCheckoutProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  storeId: string;
  onOrderComplete: () => void;
  customer?: StoreCustomer | null;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(price);
}

type CheckoutStep = "details" | "review" | "complete";

const steps: { key: CheckoutStep; label: string; icon: typeof User }[] = [
  { key: "details", label: "Details", icon: User },
  { key: "review", label: "Review", icon: ClipboardList },
  { key: "complete", label: "Confirmed", icon: CheckCircle2 },
];

function StepIndicator({ currentStep }: { currentStep: CheckoutStep }) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === currentIndex;
        const isComplete = i < currentIndex;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                  isComplete
                    ? "bg-green-100 text-green-600"
                    : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={cn("text-[10px] font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-10 sm:w-16 h-0.5 mx-1 mt-[-12px]",
                  i < currentIndex ? "bg-green-400" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StorefrontCheckout({
  open,
  onClose,
  items,
  total,
  storeId,
  onOrderComplete,
  customer,
}: StorefrontCheckoutProps) {
  const [step, setStep] = useState<CheckoutStep>("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  // Customer form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Auto-fill from signed-in customer
  useEffect(() => {
    if (customer && open) {
      setFirstName(customer.first_name || "");
      setLastName(customer.last_name || "");
      setEmail(customer.email || "");
      setPhone(customer.gsm || "");
      setAddress(customer.address || "");
    }
  }, [customer, open]);

  const resetForm = () => {
    setStep("details");
    if (!customer) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setAddress("");
    }
    setNotes("");
    setOrderNumber(null);
  };

  const handleClose = () => {
    if (step === "complete") {
      onOrderComplete();
    }
    resetForm();
    onClose();
  };

  const canSubmit =
    firstName.trim() && lastName.trim() && email.trim() && address.trim();

  const handlePlaceOrder = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      // Get the store's user_id
      const { data: storeRow } = await supabaseClient
        .from("stores")
        .select("user_id")
        .eq("id", storeId)
        .single();

      if (!storeRow?.user_id) throw new Error("Store not found");
      const userId = storeRow.user_id;

      // Determine customer ID — reuse if signed in, create new if guest
      let customerId: string | null = null;

      if (customer?.id) {
        customerId = customer.id;
      } else {
        const { data: newCustomer } = await supabaseClient
          .from("customers")
          .insert({
            user_id: userId,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
            gsm: phone.trim(),
            address: address.trim(),
            is_active: true,
          })
          .select("id")
          .single();
        customerId = newCustomer?.id || null;
      }

      // Create order
      const { data: order } = await supabaseClient
        .from("orders")
        .insert({
          user_id: userId,
          amount: total,
          status: "Pending",
          customer_id: customerId,
          customer_name: `${firstName.trim()} ${lastName.trim()}`,
          store_id: storeId,
          notes: notes.trim(),
        })
        .select("id, order_number")
        .single();

      if (order) {
        // Create order_products
        const orderProducts = items.map((item) => ({
          user_id: userId,
          order_id: order.id,
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          product_name: item.product.name,
          product_image_url: item.product.imageUrl || null,
        }));

        await supabaseClient.from("order_products").insert(orderProducts);

        setOrderNumber(order.order_number);
      }

      setStep("complete");
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Step progress indicator */}
        <StepIndicator currentStep={step} />

        {step === "details" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Details
              </DialogTitle>
              <DialogDescription>
                Enter your information to complete the order.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    Email *
                  </span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    Phone
                  </span>
                </Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Delivery Address *
                  </span>
                </Label>
                <Textarea
                  id="address"
                  placeholder="123 Main St, City, State, ZIP"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Order Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                disabled={!canSubmit}
                onClick={() => setStep("review")}
                className="gap-2"
              >
                Review Order
                <CreditCard className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === "review" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Review Order
              </DialogTitle>
              <DialogDescription>
                Confirm your order details before placing it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Customer summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-1.5">
                <p className="text-sm font-medium">
                  {firstName} {lastName}
                </p>
                <p className="text-xs text-muted-foreground">{email}</p>
                {phone && (
                  <p className="text-xs text-muted-foreground">{phone}</p>
                )}
                <p className="text-xs text-muted-foreground">{address}</p>
              </div>

              <Separator />

              {/* Order items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-md bg-muted/50 overflow-hidden shrink-0">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                          <ShoppingBag className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(item.product.price)} x {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold shrink-0">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">
                  {formatPrice(total)}
                </span>
              </div>
            </div>

            <div className="flex justify-between gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setStep("details")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Place Order
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {step === "complete" && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
            {orderNumber && (
              <p className="text-muted-foreground mb-1">
                Order #{orderNumber}
              </p>
            )}
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              Thank you for your order, {firstName}! You'll receive a
              confirmation at <strong>{email}</strong>.
            </p>
            <Button onClick={handleClose} className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
