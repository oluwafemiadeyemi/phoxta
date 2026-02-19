import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";

/**
 * GET  /api/whatsapp/webhook — Meta verification handshake
 * POST /api/whatsapp/webhook — Incoming WhatsApp messages & status updates
 *
 * Tables have been renamed from whatsapp_* → messaging_* to support
 * multi-channel messaging. WhatsApp is now one channel among several.
 */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge) {
    const supabase = createServiceRoleClient();
    const { data: config } = await supabase
      .from("messaging_config")
      .select("id")
      .eq("wa_verify_token", token)
      .limit(1)
      .single();

    if (config) {
      return new NextResponse(challenge, { status: 200 });
    }
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createServiceRoleClient();

    const entries = body?.entry ?? [];
    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        if (change.field !== "messages") continue;
        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;

        if (!phoneNumberId) continue;

        // Find matching config by WhatsApp phone number ID
        const { data: config } = await supabase
          .from("messaging_config")
          .select("id, user_id, ai_enabled, ai_greeting, ai_persona, ai_auto_reply_delay_ms, ai_handle_orders, ai_handle_products, ai_handle_support, ai_escalation_keywords, wa_phone_number_id")
          .eq("wa_phone_number_id", phoneNumberId)
          .eq("is_active", true)
          .limit(1)
          .single();

        if (!config) continue;

        const messages = value?.messages ?? [];
        for (const msg of messages) {
          await handleIncomingMessage(supabase, config, msg, value?.contacts);
        }

        const statuses = value?.statuses ?? [];
        for (const status of statuses) {
          await handleStatusUpdate(supabase, config, status);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ status: "ok" });
  }
}

async function handleIncomingMessage(
  supabase: ReturnType<typeof createServiceRoleClient>,
  config: any,
  msg: any,
  contacts: any[],
) {
  const waId = msg.from;
  const contact = contacts?.find((c: any) => c.wa_id === waId);
  const customerName = contact?.profile?.name || waId;

  // Find or create conversation (channel = whatsapp)
  let { data: conversation } = await supabase
    .from("messaging_conversations")
    .select("id, unread_count, ai_handled, ai_escalated, ai_context, customer_id")
    .eq("config_id", config.id)
    .eq("contact_id", waId)
    .eq("channel", "whatsapp")
    .limit(1)
    .single();

  if (!conversation) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", config.user_id)
      .or(`gsm.eq.${waId},gsm.eq.+${waId}`)
      .limit(1)
      .single();

    const { data: newConv } = await supabase
      .from("messaging_conversations")
      .insert({
        user_id: config.user_id,
        config_id: config.id,
        channel: "whatsapp",
        contact_id: waId,
        customer_name: customerName,
        customer_phone: waId,
        customer_id: customer?.id || null,
        status: "open",
        unread_count: 0,
        ai_handled: config.ai_enabled,
        ai_context: {},
      })
      .select("id, unread_count, ai_handled, ai_escalated, ai_context, customer_id")
      .single();

    conversation = newConv;
  }

  if (!conversation) return;

  // Parse message content
  const messageType = msg.type || "text";
  let body = "";
  let mediaUrl = "";
  let mediaMime = "";
  let mediaCaption = "";
  let latitude: number | null = null;
  let longitude: number | null = null;
  let locationName = "";

  switch (messageType) {
    case "text":
      body = msg.text?.body || "";
      break;
    case "image":
      body = msg.image?.caption || "";
      mediaCaption = msg.image?.caption || "";
      mediaMime = msg.image?.mime_type || "";
      // Media URL needs to be fetched from Meta API separately
      mediaUrl = msg.image?.id || "";
      break;
    case "video":
      mediaCaption = msg.video?.caption || "";
      mediaMime = msg.video?.mime_type || "";
      mediaUrl = msg.video?.id || "";
      break;
    case "audio":
      mediaMime = msg.audio?.mime_type || "";
      mediaUrl = msg.audio?.id || "";
      break;
    case "document":
      mediaCaption = msg.document?.caption || msg.document?.filename || "";
      mediaMime = msg.document?.mime_type || "";
      mediaUrl = msg.document?.id || "";
      break;
    case "location":
      latitude = msg.location?.latitude;
      longitude = msg.location?.longitude;
      locationName = msg.location?.name || "";
      body = locationName || `Location: ${latitude}, ${longitude}`;
      break;
    case "interactive":
      body = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "";
      break;
    default:
      body = `[${messageType} message]`;
  }

  const preview = body.length > 100 ? body.slice(0, 100) + "..." : body;

  // Insert message
  await supabase.from("messaging_messages").insert({
    user_id: config.user_id,
    conversation_id: conversation.id,
    external_message_id: msg.id || "",
    channel: "whatsapp",
    direction: "inbound",
    message_type: messageType,
    body,
    media_url: mediaUrl,
    media_mime_type: mediaMime,
    media_caption: mediaCaption,
    latitude,
    longitude,
    location_name: locationName,
    status: "received",
    created_at: msg.timestamp
      ? new Date(parseInt(msg.timestamp) * 1000).toISOString()
      : new Date().toISOString(),
  });

  // Update conversation
  await supabase
    .from("messaging_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: preview,
      unread_count: (conversation.unread_count || 0) + 1,
      customer_name: customerName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  // Check for escalation keywords
  if (config.ai_enabled && !conversation.ai_escalated) {
    const escalationKeywords: string[] = config.ai_escalation_keywords || [];
    const lowerBody = body.toLowerCase();
    const shouldEscalate = escalationKeywords.some((kw: string) =>
      lowerBody.includes(kw.toLowerCase()),
    );
    if (shouldEscalate) {
      await supabase
        .from("messaging_conversations")
        .update({ ai_escalated: true, ai_handled: false })
        .eq("id", conversation.id);
      return; // Don't auto-reply — escalated to human
    }
  }

  // AI auto-reply if enabled and conversation is AI-handled
  if (
    config.ai_enabled &&
    conversation.ai_handled &&
    !conversation.ai_escalated &&
    messageType === "text" &&
    body.trim()
  ) {
    // Fire-and-forget AI reply (non-blocking)
    triggerAiReply(config, conversation, body).catch((err) =>
      console.error("AI reply error:", err),
    );
  }

}

async function handleStatusUpdate(
  supabase: ReturnType<typeof createServiceRoleClient>,
  config: any,
  status: any,
) {
  const waMessageId = status.id;
  const statusValue = status.status; // sent | delivered | read | failed

  const updates: Record<string, any> = {
    status: statusValue,
  };
  if (statusValue === "sent") updates.sent_at = new Date().toISOString();
  if (statusValue === "delivered") updates.delivered_at = new Date().toISOString();
  if (statusValue === "read") updates.read_at = new Date().toISOString();
  if (statusValue === "failed") {
    updates.error_message = status.errors?.[0]?.message || "Delivery failed";
  }

  await supabase
    .from("messaging_messages")
    .update(updates)
    .eq("external_message_id", waMessageId)
    .eq("user_id", config.user_id);
}

/**
 * AI auto-reply using OpenAI
 */
async function triggerAiReply(config: any, conversation: any, customerMessage: string) {
  // Delay to feel more natural
  const delay = config.ai_auto_reply_delay_ms || 2000;
  await new Promise((r) => setTimeout(r, delay));

  const supabase = createServiceRoleClient();

  // Build context from recent messages
  const { data: recentMessages } = await supabase
    .from("messaging_messages")
    .select("direction, body, message_type, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const history = (recentMessages || [])
    .reverse()
    .map((m: any) => ({
      role: m.direction === "inbound" ? "user" as const : "assistant" as const,
      content: m.body || `[${m.message_type}]`,
    }));

  // Get store context if configured
  let storeContext = "";
  if (config.ai_handle_orders || config.ai_handle_products) {
    const { data: configFull } = await supabase
      .from("messaging_config")
      .select("store_id")
      .eq("id", config.id)
      .single();

    if (configFull?.store_id) {
      // Get recent products for context
      if (config.ai_handle_products) {
        const { data: products } = await supabase
          .from("products")
          .select("name, price, description")
          .eq("is_active", true)
          .limit(10);
        if (products?.length) {
          storeContext += "\n\nAvailable products:\n" +
            products.map((p: any) => `- ${p.name}: £${p.price} — ${p.description || ""}`).join("\n");
        }
      }

      // Get customer's recent orders
      if (config.ai_handle_orders && conversation.customer_id) {
        const { data: orders } = await supabase
          .from("orders")
          .select("order_number, amount, status, created_at, payment_status")
          .eq("customer_id", conversation.customer_id)
          .order("created_at", { ascending: false })
          .limit(5);
        if (orders?.length) {
          storeContext += "\n\nCustomer's recent orders:\n" +
            orders.map((o: any) =>
              `- Order #${o.order_number}: £${o.amount} — ${o.status} (${o.payment_status})`
            ).join("\n");
        }
      }
    }
  }

  const systemPrompt = `${config.ai_persona || "You are a helpful customer service agent."}
${storeContext}

Rules:
- Keep responses concise (1-3 sentences unless the customer needs details).
- Be warm, professional, and helpful.
- If you don't know something specific, offer to connect with a human agent.
- Never share sensitive data like full card numbers or passwords.
- Use emojis sparingly and professionally.
- Format for WhatsApp (no markdown, use *bold* and _italic_ for emphasis).`;

  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
      ],
    });

    const aiReply = completion.choices[0]?.message?.content?.trim();
    if (!aiReply) return;

    // Send via WhatsApp API
    const { data: fullConfig } = await supabase
      .from("messaging_config")
      .select("wa_access_token, wa_phone_number_id")
      .eq("id", config.id)
      .single();

    if (!fullConfig?.wa_access_token || !fullConfig?.wa_phone_number_id) return;

    const waResponse = await fetch(
      `https://graph.facebook.com/v21.0/${fullConfig.wa_phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${fullConfig.wa_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: conversation.contact_id,
          type: "text",
          text: { body: aiReply },
        }),
      },
    );

    const waData = await waResponse.json();
    const waMessageId = waData?.messages?.[0]?.id || "";

    // Save AI message
    await supabase.from("messaging_messages").insert({
      user_id: config.user_id,
      conversation_id: conversation.id,
      external_message_id: waMessageId,
      channel: "whatsapp",
      direction: "outbound",
      message_type: "text",
      body: aiReply,
      status: waMessageId ? "sent" : "failed",
      ai_generated: true,
      ai_confidence: 0.85,
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    // Update conversation
    await supabase
      .from("messaging_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: aiReply.slice(0, 100),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);

  } catch (err) {
    console.error("AI reply generation failed:", err);
  }
}
