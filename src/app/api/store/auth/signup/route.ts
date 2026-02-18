import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";
import crypto from "crypto";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100_000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, password, phone, address, storeId } =
      body;

    if (!email || !password || !firstName || !lastName || !storeId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // Get the store's owner user_id
    const { data: store } = await supabase
      .from("stores")
      .select("user_id")
      .eq("id", storeId)
      .single();

    if (!store?.user_id) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Check if this email already exists for this store
    const { data: existing } = await supabase
      .from("customers")
      .select("id, password_hash")
      .eq("store_id", storeId)
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existing?.password_hash) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 },
      );
    }

    const passwordHash = hashPassword(password);

    let customerId: string;

    if (existing && !existing.password_hash) {
      // Customer record exists from a guest checkout — upgrade to an account
      const { error: updateErr } = await supabase
        .from("customers")
        .update({
          password_hash: passwordHash,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          gsm: phone?.trim() || "",
          address: address?.trim() || "",
          store_id: storeId,
          email_verified: false,
        })
        .eq("id", existing.id);

      if (updateErr) throw updateErr;
      customerId = existing.id;
    } else {
      // Create new customer record
      const { data: customer, error: insertErr } = await supabase
        .from("customers")
        .insert({
          user_id: store.user_id,
          store_id: storeId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          gsm: phone?.trim() || "",
          address: address?.trim() || "",
          password_hash: passwordHash,
          is_active: true,
          email_verified: false,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      customerId = customer!.id;
    }

    // Create session
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await supabase.from("customer_sessions").insert({
      customer_id: customerId,
      token,
      expires_at: expiresAt.toISOString(),
    });

    // Update last login
    await supabase
      .from("customers")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", customerId);

    // Get the customer data to return
    const { data: customerData } = await supabase
      .from("customers")
      .select("id, first_name, last_name, email, gsm, address, avatar_url, created_at")
      .eq("id", customerId)
      .single();

    const response = NextResponse.json({
      customer: customerData,
      message: "Account created successfully",
    });

    // Set httpOnly cookie
    response.cookies.set("store_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create account" },
      { status: 500 },
    );
  }
}
