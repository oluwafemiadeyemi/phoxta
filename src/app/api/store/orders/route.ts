import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";

/** GET /api/store/orders?customerId=xxx */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("store_session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Verify session
    const { data: session } = await supabase
      .from("customer_sessions")
      .select("customer_id, expires_at")
      .eq("token", token)
      .single();

    if (!session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // Fetch orders for this customer
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", session.customer_id)
      .order("created_at", { ascending: false });

    if (ordersErr) throw ordersErr;

    // Fetch order products for all orders
    const orderIds = (orders || []).map((o: any) => o.id);
    let orderProducts: any[] = [];

    if (orderIds.length > 0) {
      const { data: products } = await supabase
        .from("order_products")
        .select("*")
        .in("order_id", orderIds);
      orderProducts = products || [];
    }

    // Attach products to their orders
    const ordersWithProducts = (orders || []).map((order: any) => ({
      ...order,
      items: orderProducts.filter((p: any) => p.order_id === order.id),
    }));

    return NextResponse.json({ orders: ordersWithProducts });
  } catch (err: any) {
    console.error("Fetch orders error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch orders" },
      { status: 500 },
    );
  }
}
