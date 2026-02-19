import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabaseServer";

/**
 * POST /api/store/payments/confirm
 * Body: { orderId, paymentIntentId }
 *
 * Verifies the payment succeeded and updates the order.
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, paymentIntentId } = await req.json();

    if (!orderId || !paymentIntentId) {
      return NextResponse.json(
        { error: "Missing orderId or paymentIntentId" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // Look up the store's Stripe secret key from the order's store
    const { data: orderRow } = await supabase
      .from("orders")
      .select("store_id")
      .eq("id", orderId)
      .single();

    let stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (orderRow?.store_id) {
      const { data: storeRow } = await supabase
        .from("stores")
        .select("stripe_secret_key")
        .eq("id", orderRow.store_id)
        .single();
      if (storeRow?.stripe_secret_key) {
        stripeSecretKey = storeRow.stripe_secret_key;
      }
    }

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Payment processing is not configured" },
        { status: 503 },
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-01-28.clover",
    });

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "Confirmed",
        })
        .eq("id", orderId);

      return NextResponse.json({ status: "paid" });
    } else {
      await supabase
        .from("orders")
        .update({
          payment_status: paymentIntent.status === "canceled" ? "failed" : "processing",
        })
        .eq("id", orderId);

      return NextResponse.json({ status: paymentIntent.status });
    }
  } catch (err: any) {
    console.error("Confirm payment error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to confirm payment" },
      { status: 500 },
    );
  }
}
