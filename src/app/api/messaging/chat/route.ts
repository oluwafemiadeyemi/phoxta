import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";

/**
 * Web Chat API for storefront visitors (unauthenticated).
 *
 * GET  /api/messaging/chat?storeId=X&sessionId=Y  → fetch messages
 * POST /api/messaging/chat  → send a message from customer
 *     Body: { storeId, sessionId, customerName?, customerEmail?, message }
 */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const storeId = url.searchParams.get("storeId");
  const sessionId = url.searchParams.get("sessionId");

  if (!storeId || !sessionId) {
    return NextResponse.json({ error: "storeId and sessionId required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Find config for this store
  let { data: config } = await supabase
    .from("messaging_config")
    .select("id, chat_widget_enabled, chat_widget_title, chat_widget_subtitle, chat_widget_color, chat_widget_greeting, business_name")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .limit(1)
    .single();

  // Auto-create a default config if none exists
  if (!config) {
    const { data: store } = await supabase
      .from("stores")
      .select("id, user_id, title")
      .eq("id", storeId)
      .limit(1)
      .single();

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const { data: newConfig } = await supabase
      .from("messaging_config")
      .insert({
        user_id: store.user_id,
        store_id: store.id,
        channels_enabled: ["web_chat"],
        chat_widget_enabled: true,
        chat_widget_title: "Chat with us",
        chat_widget_subtitle: "We usually reply within minutes",
        chat_widget_color: "#16a34a",
        chat_widget_greeting: "Hi there! 👋 How can we help you today?",
        business_name: store.title || "",
        is_active: true,
      })
      .select("id, chat_widget_enabled, chat_widget_title, chat_widget_subtitle, chat_widget_color, chat_widget_greeting, business_name")
      .single();

    config = newConfig;
  }

  if (!config) {
    return NextResponse.json({ error: "Chat not available" }, { status: 404 });
  }

  // Find conversation for this session
  const { data: conversation } = await supabase
    .from("messaging_conversations")
    .select("id")
    .eq("config_id", config.id)
    .eq("contact_id", sessionId)
    .eq("channel", "web_chat")
    .limit(1)
    .single();

  if (!conversation) {
    // No conversation yet — return config info + empty messages
    return NextResponse.json({
      config: {
        title: config.chat_widget_title,
        subtitle: config.chat_widget_subtitle,
        color: config.chat_widget_color,
        greeting: config.chat_widget_greeting,
        businessName: config.business_name,
      },
      messages: [],
    });
  }

  // Fetch messages
  const { data: messages } = await supabase
    .from("messaging_messages")
    .select("id, direction, message_type, body, media_url, media_caption, interactive_data, ai_generated, created_at, status")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(100);

  return NextResponse.json({
    config: {
      title: config.chat_widget_title,
      subtitle: config.chat_widget_subtitle,
      color: config.chat_widget_color,
      greeting: config.chat_widget_greeting,
      businessName: config.business_name,
    },
    conversationId: conversation.id,
    messages: messages || [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const { storeId, sessionId, customerName, customerEmail, customerId, message } = await req.json();

    if (!storeId || !sessionId || !message?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Find config
    let { data: config } = await supabase
      .from("messaging_config")
      .select("id, user_id, chat_widget_enabled, ai_enabled, ai_greeting, ai_persona, ai_auto_reply_delay_ms, ai_handle_orders, ai_handle_products, ai_handle_support, ai_escalation_keywords, store_id")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .limit(1)
      .single();

    // Auto-create a default config if none exists
    if (!config) {
      const { data: store } = await supabase
        .from("stores")
        .select("id, user_id, title")
        .eq("id", storeId)
        .limit(1)
        .single();

      if (!store) {
        return NextResponse.json({ error: "Store not found" }, { status: 404 });
      }

      const { data: newConfig } = await supabase
        .from("messaging_config")
        .insert({
          user_id: store.user_id,
          store_id: store.id,
          channels_enabled: ["web_chat"],
          chat_widget_enabled: true,
          chat_widget_title: "Chat with us",
          chat_widget_subtitle: "We usually reply within minutes",
          chat_widget_color: "#16a34a",
          chat_widget_greeting: "Hi there! 👋 How can we help you today?",
          business_name: store.title || "",
          is_active: true,
        })
        .select("id, user_id, chat_widget_enabled, ai_enabled, ai_greeting, ai_persona, ai_auto_reply_delay_ms, ai_handle_orders, ai_handle_products, ai_handle_support, ai_escalation_keywords, store_id")
        .single();

      config = newConfig;
    }

    if (!config) {
      return NextResponse.json({ error: "Chat not available" }, { status: 404 });
    }

    // Find or create conversation
    let { data: conversation } = await supabase
      .from("messaging_conversations")
      .select("id, unread_count, ai_handled, ai_escalated, ai_context, customer_id")
      .eq("config_id", config.id)
      .eq("contact_id", sessionId)
      .eq("channel", "web_chat")
      .limit(1)
      .single();

    if (!conversation) {
      // Use provided customerId (logged-in customer) or try to match by email
      let resolvedCustomerId: string | null = customerId || null;
      if (!resolvedCustomerId && customerEmail) {
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", config.user_id)
          .ilike("email", customerEmail)
          .limit(1)
          .single();
        resolvedCustomerId = existingCustomer?.id || null;
      }

      const { data: newConv } = await supabase
        .from("messaging_conversations")
        .insert({
          user_id: config.user_id,
          config_id: config.id,
          channel: "web_chat",
          contact_id: sessionId,
          customer_name: customerName || "Visitor",
          customer_email: customerEmail || "",
          customer_phone: "",
          customer_id: resolvedCustomerId,
          status: "open",
          unread_count: 0,
          ai_handled: config.ai_enabled,
          ai_context: {},
        })
        .select("id, unread_count, ai_handled, ai_escalated, ai_context, customer_id")
        .single();

      conversation = newConv;
    }

    if (!conversation) {
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }

    const preview = message.length > 100 ? message.slice(0, 100) + "..." : message;

    // Save inbound message
    await supabase.from("messaging_messages").insert({
      user_id: config.user_id,
      conversation_id: conversation.id,
      channel: "web_chat",
      direction: "inbound",
      message_type: "text",
      body: message.trim(),
      status: "received",
      created_at: new Date().toISOString(),
    });

    // Update conversation
    await supabase
      .from("messaging_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: preview,
        unread_count: (conversation.unread_count || 0) + 1,
        customer_name: customerName || undefined,
        customer_email: customerEmail || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);

    // Check escalation keywords
    if (config.ai_enabled && !conversation.ai_escalated) {
      const escalationKeywords: string[] = config.ai_escalation_keywords || [];
      const lowerBody = message.toLowerCase();
      const shouldEscalate = escalationKeywords.some((kw: string) =>
        lowerBody.includes(kw.toLowerCase()),
      );
      if (shouldEscalate) {
        await supabase
          .from("messaging_conversations")
          .update({ ai_escalated: true, ai_handled: false })
          .eq("id", conversation.id);
        return NextResponse.json({ success: true, conversationId: conversation.id });
      }
    }

    // AI auto-reply (fire and forget)
    if (
      config.ai_enabled &&
      conversation.ai_handled &&
      !conversation.ai_escalated
    ) {
      triggerWebChatAiReply(config, conversation, message.trim()).catch((err) =>
        console.error("Web chat AI reply error:", err),
      );
    }

    return NextResponse.json({ success: true, conversationId: conversation.id });
  } catch (err: any) {
    console.error("Web chat error:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}

/**
 * AI auto-reply for web chat messages
 */
async function triggerWebChatAiReply(config: any, conversation: any, customerMessage: string) {
  const delay = config.ai_auto_reply_delay_ms || 1500;
  await new Promise((r) => setTimeout(r, delay));

  const supabase = createServiceRoleClient();

  // Build context
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

  // Store context
  let storeContext = "";
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

  const systemPrompt = `${config.ai_persona || "You are a helpful customer service agent."}
${storeContext}

Rules:
- Keep responses concise (1-3 sentences unless the customer needs details).
- Be warm, professional, and helpful.
- If you don't know something specific, offer to connect with a human agent.
- Never share sensitive data like full card numbers or passwords.
- Use emojis sparingly and professionally.
- Format for web chat (use plain text, no markdown).`;

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

    // Save AI reply
    await supabase.from("messaging_messages").insert({
      user_id: config.user_id,
      conversation_id: conversation.id,
      channel: "web_chat",
      direction: "outbound",
      message_type: "text",
      body: aiReply,
      status: "sent",
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
    console.error("Web chat AI reply failed:", err);
  }
}
