import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";

/**
 * CRM outbound reply endpoint for web_chat conversations.
 *
 * POST /api/messaging/send
 * Body: { configId, conversationId, to, type, body, channel }
 *
 * "to" = contact_id (session id for web_chat).
 * Unlike WhatsApp, web_chat messages just get saved to the DB –
 * the storefront widget polls for new messages.
 */
export async function POST(req: NextRequest) {
  try {
    const { configId, conversationId, body, channel } = await req.json();

    if (!configId || !conversationId || !body?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Verify config exists
    const { data: config } = await supabase
      .from("messaging_config")
      .select("id, user_id")
      .eq("id", configId)
      .limit(1)
      .single();

    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    // Verify conversation exists
    const { data: conversation } = await supabase
      .from("messaging_conversations")
      .select("id, channel, contact_id")
      .eq("id", conversationId)
      .limit(1)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const preview = body.length > 100 ? body.slice(0, 100) + "..." : body;

    // Save outbound message
    const { error: insertError } = await supabase.from("messaging_messages").insert({
      user_id: config.user_id,
      conversation_id: conversationId,
      channel: conversation.channel || channel || "web_chat",
      direction: "outbound",
      message_type: "text",
      body: body.trim(),
      status: "sent",
      sent_at: now,
      created_at: now,
    });

    if (insertError) {
      console.error("Failed to insert message:", insertError);
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
    }

    // Update conversation preview + reset unread + mark as last message
    await supabase
      .from("messaging_conversations")
      .update({
        last_message_at: now,
        last_message_preview: preview,
        unread_count: 0,
        updated_at: now,
      })
      .eq("id", conversationId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Messaging send error:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
