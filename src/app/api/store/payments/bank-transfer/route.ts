import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";

/**
 * POST /api/store/payments/bank-transfer
 * Body: { orderId, storeId }
 *
 * Marks the order as "bank_transfer" and returns bank details
 * so the customer can make the transfer.
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, storeId } = await req.json();

    if (!orderId || !storeId) {
      return NextResponse.json(
        { error: "Missing orderId or storeId" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // Get store bank details
    const { data: store } = await supabase
      .from("stores")
      .select(
        "title, bank_name, bank_account_name, bank_account_number, bank_sort_code, bank_iban, bank_reference_prefix",
      )
      .eq("id", storeId)
      .single();

    // Get order number for reference
    const { data: order } = await supabase
      .from("orders")
      .select("order_number")
      .eq("id", orderId)
      .single();

    const reference = `${store?.bank_reference_prefix || "ORD"}-${order?.order_number || orderId.slice(0, 8).toUpperCase()}`;

    // Update order
    await supabase
      .from("orders")
      .update({
        payment_method: "bank_transfer",
        payment_status: "awaiting_payment",
        payment_reference: reference,
      })
      .eq("id", orderId);

    return NextResponse.json({
      bankDetails: {
        bankName: store?.bank_name || "",
        accountName: store?.bank_account_name || store?.title || "",
        accountNumber: store?.bank_account_number || "",
        sortCode: store?.bank_sort_code || "",
        iban: store?.bank_iban || "",
        reference,
      },
    });
  } catch (err: any) {
    console.error("Bank transfer error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process bank transfer" },
      { status: 500 },
    );
  }
}
