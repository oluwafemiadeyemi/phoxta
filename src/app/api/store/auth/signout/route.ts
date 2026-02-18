import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("store_session")?.value;

    if (token) {
      const supabase = createServiceRoleClient();
      await supabase.from("customer_sessions").delete().eq("token", token);
    }

    const response = NextResponse.json({ message: "Signed out" });
    response.cookies.delete("store_session");
    return response;
  } catch (err: any) {
    console.error("Signout error:", err);
    const response = NextResponse.json({ message: "Signed out" });
    response.cookies.delete("store_session");
    return response;
  }
}
