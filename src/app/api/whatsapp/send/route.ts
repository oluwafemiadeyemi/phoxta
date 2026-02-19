import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";

/**
 * POST /api/whatsapp/send
 * Body: { configId, conversationId, to, type, body, templateName?, templateParams? }
 *
 * Sends a WhatsApp message via Meta Cloud API.
 */
export async function POST(req: NextRequest) {
  try {
    const {
      configId,
      conversationId,
      to,
      type = "text",
      body = "",
      templateName,
      templateParams,
      mediaUrl,
      mediaCaption,
    } = await req.json();

    if (!configId || !to) {
      return NextResponse.json(
        { error: "Missing configId or recipient" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // Get config
    const { data: config } = await supabase
      .from("messaging_config")
      .select("id, user_id, wa_access_token, wa_phone_number_id")
      .eq("id", configId)
      .single();

    if (!config?.wa_access_token || !config?.wa_phone_number_id) {
      return NextResponse.json(
        { error: "WhatsApp not configured" },
        { status: 400 },
      );
    }

    // Build the WhatsApp API payload
    let waPayload: any = {
      messaging_product: "whatsapp",
      to,
    };

    if (type === "template" && templateName) {
      waPayload.type = "template";
      waPayload.template = {
        name: templateName,
        language: { code: "en" },
        components: templateParams || [],
      };
    } else if (type === "image" && mediaUrl) {
      waPayload.type = "image";
      waPayload.image = {
        link: mediaUrl,
        caption: mediaCaption || "",
      };
    } else if (type === "document" && mediaUrl) {
      waPayload.type = "document";
      waPayload.document = {
        link: mediaUrl,
        caption: mediaCaption || "",
      };
    } else {
      waPayload.type = "text";
      waPayload.text = { body };
    }

    // Send to Meta API
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${config.wa_phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.wa_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(waPayload),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.error?.message || "Failed to send message",
          details: data,
        },
        { status: response.status },
      );
    }

    const waMessageId = data?.messages?.[0]?.id || "";

    // Save outbound message
    if (conversationId) {
      await supabase.from("messaging_messages").insert({
        user_id: config.user_id,
        conversation_id: conversationId,
        external_message_id: waMessageId,
        channel: "whatsapp",
        direction: "outbound",
        message_type: type === "template" ? "template" : type,
        body: type === "template" ? `[Template: ${templateName}]` : body,
        media_url: mediaUrl || "",
        media_caption: mediaCaption || "",
        template_name: templateName || "",
        template_params: templateParams || [],
        status: "sent",
        ai_generated: false,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      // Update conversation
      const preview =
        type === "template"
          ? `[Template: ${templateName}]`
          : body.length > 100
            ? body.slice(0, 100) + "..."
            : body;

      await supabase
        .from("messaging_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: preview,
          unread_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    }

    // Analytics – skipped (handled separately)

    return NextResponse.json({
      success: true,
      messageId: waMessageId,
    });
  } catch (err: any) {
    console.error("WhatsApp send error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to send message" },
      { status: 500 },
    );
  }
}
