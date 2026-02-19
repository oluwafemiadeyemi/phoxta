import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabaseServer";

/**
 * POST /api/store/payments/create-intent
 * Body: { storeId, amount, currency?, orderId, customerEmail? }
 *
 * Creates a Stripe PaymentIntent using the store-owner's Stripe secret key
 * (stored in the DB per-store, falling back to env var).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      storeId,
      amount,
      currency = "gbp",
      orderId,
      customerEmail,
    } = body;

    if (!storeId || !amount || !orderId) {
      return NextResponse.json(
        { error: "Missing storeId, amount, or orderId" },
        { status: 400 },
      );
    }

    // Look up the store's own Stripe secret key first, fall back to platform env
    const supabase = createServiceRoleClient();
    const { data: storeRow } = await supabase
      .from("stores")
      .select("stripe_secret_key")
      .eq("id", storeId)
      .single();

    const stripeSecretKey =
      storeRow?.stripe_secret_key || process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Payment processing is not configured" },
        { status: 503 },
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-01-28.clover",
    });

    // Amount should be in the smallest currency unit (pence for GBP)
    const amountInSmallestUnit = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId,
        storeId,
      },
      ...(customerEmail ? { receipt_email: customerEmail } : {}),
    });

    // Update order with payment intent ID
    await supabase
      .from("orders")
      .update({
        payment_intent_id: paymentIntent.id,
        payment_method: "card",
        payment_status: "processing",
      })
      .eq("id", orderId);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: any) {
    console.error("Create payment intent error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create payment" },
      { status: 500 },
    );
  }
}
