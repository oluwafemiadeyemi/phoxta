import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("store_session")?.value;

    if (!token) {
      return NextResponse.json({ customer: null }, { status: 200 });
    }

    const supabase = createServiceRoleClient();

    // Look up session
    const { data: session } = await supabase
      .from("customer_sessions")
      .select("customer_id, expires_at")
      .eq("token", token)
      .single();

    if (!session) {
      const response = NextResponse.json({ customer: null }, { status: 200 });
      response.cookies.delete("store_session");
      return response;
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      await supabase.from("customer_sessions").delete().eq("token", token);
      const response = NextResponse.json({ customer: null }, { status: 200 });
      response.cookies.delete("store_session");
      return response;
    }

    // Fetch customer
    const { data: customer } = await supabase
      .from("customers")
      .select("id, first_name, last_name, email, gsm, address, avatar_url, is_active, store_id, created_at")
      .eq("id", session.customer_id)
      .single();

    if (!customer || !customer.is_active) {
      const response = NextResponse.json({ customer: null }, { status: 200 });
      response.cookies.delete("store_session");
      return response;
    }

    return NextResponse.json({ customer });
  } catch (err: any) {
    console.error("Auth me error:", err);
    return NextResponse.json({ customer: null }, { status: 200 });
  }
}

export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    const { firstName, lastName, phone, address } = body;

    const updates: Record<string, string> = {};
    if (firstName !== undefined) updates.first_name = firstName.trim();
    if (lastName !== undefined) updates.last_name = lastName.trim();
    if (phone !== undefined) updates.gsm = phone.trim();
    if (address !== undefined) updates.address = address.trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const { error: updateErr } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", session.customer_id);

    if (updateErr) throw updateErr;

    // Return updated customer
    const { data: customer } = await supabase
      .from("customers")
      .select("id, first_name, last_name, email, gsm, address, avatar_url, is_active, store_id, created_at")
      .eq("id", session.customer_id)
      .single();

    return NextResponse.json({ customer, message: "Profile updated" });
  } catch (err: any) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { error: err?.message || "Update failed" },
      { status: 500 },
    );
  }
}
