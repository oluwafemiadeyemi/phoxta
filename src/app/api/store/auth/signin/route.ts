import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";
import crypto from "crypto";

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const verify = crypto
    .pbkdf2Sync(password, salt, 100_000, 64, "sha512")
    .toString("hex");
  return hash === verify;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, storeId } = body;

    if (!email || !password || !storeId) {
      return NextResponse.json(
        { error: "Email, password, and store ID are required" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // Find the customer by email + store
    const { data: customer } = await supabase
      .from("customers")
      .select("id, first_name, last_name, email, gsm, address, avatar_url, password_hash, is_active, created_at")
      .eq("store_id", storeId)
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (!customer || !customer.password_hash) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (!customer.is_active) {
      return NextResponse.json(
        { error: "Account is deactivated. Please contact support." },
        { status: 403 },
      );
    }

    // Verify password
    if (!verifyPassword(password, customer.password_hash)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Clean up expired sessions
    await supabase
      .from("customer_sessions")
      .delete()
      .eq("customer_id", customer.id)
      .lt("expires_at", new Date().toISOString());

    // Create a new session
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await supabase.from("customer_sessions").insert({
      customer_id: customer.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    // Update last login
    await supabase
      .from("customers")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", customer.id);

    const { password_hash: _, ...safeCustomer } = customer;

    const response = NextResponse.json({
      customer: safeCustomer,
      message: "Signed in successfully",
    });

    response.cookies.set("store_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error("Signin error:", err);
    return NextResponse.json(
      { error: err?.message || "Sign in failed" },
      { status: 500 },
    );
  }
}
