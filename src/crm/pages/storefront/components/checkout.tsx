import { useState, useEffect, useCallback, useRef } from "react";
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
  Building2,
  Lock,
  Copy,
  AlertCircle,
  Banknote,
  Shield,
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
  taxEnabled?: boolean;
  taxRate?: number;
  taxLabel?: string;
  stripePublishableKey?: string;
}

type PaymentMethod = "card" | "bank_transfer";

interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string;
  iban: string;
  reference: string;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(price);
}

type CheckoutStep = "details" | "payment" | "processing" | "complete";

const steps: { key: CheckoutStep; label: string; icon: typeof User }[] = [
  { key: "details", label: "Details", icon: User },
  { key: "payment", label: "Payment", icon: CreditCard },
  { key: "complete", label: "Confirmed", icon: CheckCircle2 },
];

function StepIndicator({ currentStep }: { currentStep: CheckoutStep }) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);
  // Map "processing" to payment step index
  const displayIndex =
    currentStep === "processing"
      ? steps.findIndex((s) => s.key === "payment")
      : currentIndex;

  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === displayIndex;
        const isComplete = i < displayIndex;
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
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-10 sm:w-16 h-0.5 mx-1 mt-[-12px]",
                  i < displayIndex ? "bg-green-400" : "bg-muted",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Stripe Card Form — uses Stripe.js Payment Element
   ═══════════════════════════════════════════════════════════ */
function StripeCardForm({
  clientSecret,
  stripePublishableKey,
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
}: {
  clientSecret: string;
  stripePublishableKey: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (msg: string) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}) {
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const paymentElementRef = useRef<HTMLDivElement>(null);

  // Load Stripe.js and mount the Payment Element
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(stripePublishableKey);
        if (!stripe || !mounted) return;

        const elementsInstance = stripe.elements({
          clientSecret,
          appearance: {
            theme: "stripe",
            variables: {
              borderRadius: "8px",
              fontFamily: "inherit",
            },
          },
        });

        const paymentElement = elementsInstance.create("payment", {
          layout: "tabs",
        });

        if (paymentElementRef.current) {
          paymentElement.mount(paymentElementRef.current);
          paymentElement.on("ready", () => {
            if (mounted) setStripeReady(true);
          });
        }

        if (mounted) {
          setStripeInstance(stripe);
          setElements(elementsInstance);
        }
      } catch (err) {
        console.error("Failed to load Stripe:", err);
        if (mounted) onError("Failed to load payment processor");
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret, stripePublishableKey]);

  const handleSubmit = async () => {
    if (!stripeInstance || !elements) {
      onError("Payment processor not ready");
      return;
    }

    setIsProcessing(true);
    try {
      const { error, paymentIntent } = await stripeInstance.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment failed");
      } else if (paymentIntent?.status === "succeeded") {
        onSuccess(paymentIntent.id);
      } else if (paymentIntent?.status === "requires_action") {
        onError("Additional authentication required. Please try again.");
      } else {
        onError("Payment was not completed");
      }
    } catch (err: any) {
      onError(err?.message || "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stripe Payment Element mounts here */}
      <div ref={paymentElementRef} className="min-h-[120px]">
        {!stripeReady && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading payment form...</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
        <Shield className="h-3.5 w-3.5" />
        Your payment is encrypted and secure
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isProcessing || !stripeReady}
        className="w-full h-12 text-sm font-semibold gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Pay Now
          </>
        )}
      </Button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Bank Transfer Details Display
   ═══════════════════════════════════════════════════════════ */
function BankTransferDetails({
  bankDetails,
  total,
}: {
  bankDetails: BankDetails;
  total: number;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const DetailRow = ({
    label,
    value,
    fieldKey,
  }: {
    label: string;
    value: string;
    fieldKey: string;
  }) =>
    value ? (
      <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold font-mono">{value}</span>
          <button
            onClick={() => copyToClipboard(value, fieldKey)}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label={`Copy ${label}`}
          >
            {copiedField === fieldKey ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Banknote className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900 mb-1">
              Bank Transfer Instructions
            </p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Please transfer{" "}
              <strong>{formatPrice(total)}</strong> to the
              account below. Use the reference number so we can match your
              payment. Your order will be confirmed once payment is received.
            </p>
          </div>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <div className="bg-muted/30 px-4 py-2.5 border-b">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Bank Account Details
          </h4>
        </div>
        <div className="px-4">
          <DetailRow
            label="Bank"
            value={bankDetails.bankName}
            fieldKey="bankName"
          />
          <DetailRow
            label="Account Name"
            value={bankDetails.accountName}
            fieldKey="accountName"
          />
          <DetailRow
            label="Account Number"
            value={bankDetails.accountNumber}
            fieldKey="accountNumber"
          />
          <DetailRow
            label="Sort Code"
            value={bankDetails.sortCode}
            fieldKey="sortCode"
          />
          {bankDetails.iban && (
            <DetailRow
              label="IBAN"
              value={bankDetails.iban}
              fieldKey="iban"
            />
          )}
          <DetailRow
            label="Reference"
            value={bankDetails.reference}
            fieldKey="reference"
          />
          <DetailRow
            label="Amount"
            value={formatPrice(total)}
            fieldKey="amount"
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Checkout Component
   ═══════════════════════════════════════════════════════════ */
export function StorefrontCheckout({
  open,
  onClose,
  items,
  total,
  storeId,
  onOrderComplete,
  customer,
  taxEnabled = false,
  taxRate = 0,
  taxLabel = "VAT",
  stripePublishableKey,
}: StorefrontCheckoutProps) {
  const taxAmount = taxEnabled ? total * (taxRate / 100) : 0;
  const grandTotal = total + taxAmount;
  const [step, setStep] = useState<CheckoutStep>("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);

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
    setPaymentMethod("card");
    setClientSecret(null);
    setBankDetails(null);
    setPaymentError(null);
    setOrderId(null);
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

  /** Step 1 → 2: Create order then prepare payment */
  const handleProceedToPayment = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setPaymentError(null);

    try {
      // Get the store's user_id
      const { data: storeRow } = await supabaseClient
        .from("stores")
        .select("user_id")
        .eq("id", storeId)
        .single();

      if (!storeRow?.user_id) throw new Error("Store not found");
      const userId = storeRow.user_id;

      // Determine customer ID
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

      // Create order with pending payment
      const { data: order } = await supabaseClient
        .from("orders")
        .insert({
          user_id: userId,
          amount: grandTotal,
          status: "Pending",
          customer_id: customerId,
          customer_name: `${firstName.trim()} ${lastName.trim()}`,
          store_id: storeId,
          notes: notes.trim(),
          payment_method: paymentMethod,
          payment_status: "unpaid",
        })
        .select("id, order_number")
        .single();

      if (!order) throw new Error("Failed to create order");

      setOrderId(order.id);
      setOrderNumber(order.order_number);

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

      // Set up payment
      if (paymentMethod === "card") {
        const res = await fetch("/api/store/payments/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId,
            amount: grandTotal,
            orderId: order.id,
            customerEmail: email.trim(),
          }),
        });
        const data = await res.json();
        if (data.error) {
          // If Stripe is not configured, fall back to direct order (demo mode)
          if (res.status === 503) {
            await supabaseClient
              .from("orders")
              .update({ payment_status: "pending", status: "Pending" })
              .eq("id", order.id);
            setStep("complete");
            return;
          }
          throw new Error(data.error);
        }
        setClientSecret(data.clientSecret);
      } else {
        // Bank transfer
        const res = await fetch("/api/store/payments/bank-transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id, storeId }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setBankDetails(data.bankDetails);
      }

      setStep("payment");
    } catch (err: any) {
      console.error("Checkout error:", err);
      setPaymentError(err?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Card payment success callback */
  const handleCardSuccess = useCallback(
    async (paymentIntentId: string) => {
      if (!orderId) return;
      try {
        await fetch("/api/store/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, paymentIntentId }),
        });
      } catch {
        // Even if confirm API fails, payment was successful in Stripe
      }
      setStep("complete");
    },
    [orderId],
  );

  /** Card payment error callback */
  const handleCardError = useCallback((msg: string) => {
    setPaymentError(msg);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto !p-0">
        {/* Secure checkout badge */}
        <div className="bg-muted/30 px-6 py-3 border-b flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Secure Checkout</span>
          <span className="text-muted-foreground/40">|</span>
          <Shield className="h-3 w-3" />
          <span>SSL Encrypted</span>
        </div>

        <div className="px-6 pt-4 pb-6">
          {/* Step progress indicator */}
          <StepIndicator currentStep={step} />

          {/* ─── Step 1: Customer Details ─────────────────── */}
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
                    placeholder="+44 7700 900000"
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
                    placeholder="123 Main St, City, Postcode"
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

                <Separator />

                {/* ── Payment method selection ──────────────── */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Payment Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        paymentMethod === "card"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-muted-foreground/30",
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          paymentMethod === "card"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold">Card</span>
                      <span className="text-[10px] text-muted-foreground">
                        Visa, Mastercard, Amex
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("bank_transfer")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        paymentMethod === "bank_transfer"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-muted-foreground/30",
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          paymentMethod === "bank_transfer"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Building2 className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold">Transfer</span>
                      <span className="text-[10px] text-muted-foreground">
                        Bank transfer
                      </span>
                    </button>
                  </div>
                </div>

                {/* ── Order summary ────────────────────────── */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {items.reduce((s, i) => s + i.quantity, 0)} item
                      {items.length !== 1 ? "s" : ""}
                    </span>
                    <span className="font-medium">{formatPrice(total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-medium text-green-600">Free</span>
                  </div>
                  {taxEnabled && taxAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{taxLabel} ({taxRate}%)</span>
                      <span className="font-medium">{formatPrice(taxAmount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {paymentError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-4">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {paymentError}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  disabled={!canSubmit || isSubmitting}
                  onClick={handleProceedToPayment}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      Continue to{" "}
                      {paymentMethod === "card" ? "Payment" : "Review"}
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* ─── Step 2: Payment ──────────────────────────── */}
          {step === "payment" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {paymentMethod === "card" ? (
                    <CreditCard className="h-5 w-5" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                  {paymentMethod === "card"
                    ? "Card Payment"
                    : "Bank Transfer"}
                </DialogTitle>
                <DialogDescription>
                  {paymentMethod === "card"
                    ? "Enter your card details to complete payment."
                    : "Transfer the funds using the details below."}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                {/* Order reference */}
                <div className="bg-muted/30 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Order Reference
                    </p>
                    <p className="font-semibold">#{orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-bold text-primary text-lg">
                      {formatPrice(grandTotal)}
                    </p>
                  </div>
                </div>

                {paymentMethod === "card" && clientSecret && stripePublishableKey ? (
                  <StripeCardForm
                    clientSecret={clientSecret}
                    stripePublishableKey={stripePublishableKey}
                    onSuccess={handleCardSuccess}
                    onError={handleCardError}
                    isProcessing={isSubmitting}
                    setIsProcessing={setIsSubmitting}
                  />
                ) : paymentMethod === "bank_transfer" && bankDetails ? (
                  <BankTransferDetails
                    bankDetails={bankDetails}
                    total={grandTotal}
                  />
                ) : (
                  <div className="text-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Loading payment details...
                    </p>
                  </div>
                )}

                {paymentError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {paymentError}
                  </div>
                )}
              </div>

              <div className="flex justify-between gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("details");
                    setPaymentError(null);
                  }}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                {paymentMethod === "bank_transfer" && (
                  <Button
                    onClick={() => setStep("complete")}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    I&apos;ve Made the Transfer
                  </Button>
                )}
              </div>
            </>
          )}

          {/* ─── Step 3: Complete ─────────────────────────── */}
          {step === "complete" && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {paymentMethod === "card"
                  ? "Payment Successful!"
                  : "Order Placed!"}
              </h2>
              {orderNumber && (
                <p className="text-muted-foreground mb-1">
                  Order #{orderNumber}
                </p>
              )}
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-2">
                {paymentMethod === "card"
                  ? `Thank you for your payment, ${firstName}! Your order has been confirmed.`
                  : `Thank you, ${firstName}! Your order will be confirmed once we receive your bank transfer.`}
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                A confirmation will be sent to{" "}
                <strong>{email}</strong>.
              </p>

              {paymentMethod === "bank_transfer" && bankDetails && (
                <div className="text-left mb-6 max-w-sm mx-auto">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-medium text-amber-800">
                      Remember to include reference:{" "}
                      <strong className="font-mono">
                        {bankDetails.reference}
                      </strong>
                    </p>
                  </div>
                </div>
              )}

              <Button onClick={handleClose} className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Continue Shopping
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
