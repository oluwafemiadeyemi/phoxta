import { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";

/* ═══════════════════════════════════════════════════════════
   Phoxta Assistant – AI Agent API
   Streaming endpoint with OpenAI function-calling that can
   perform any CRM operation on the user's behalf.
   ═══════════════════════════════════════════════════════════ */

// ── Allowed tables ──────────────────────────────────────────
const ALLOWED_TABLES = new Set([
  "contacts", "companies", "deals", "tags", "pipeline_stages",
  "projects", "tasks", "team_members", "project_stages",
  "comments", "attachments", "quotes", "company_settings",
  "orders", "order_products", "products", "categories",
  "stores", "couriers", "customers", "reviews", "staff",
  "email_accounts", "email_templates", "emails",
  "finance_transactions", "payroll_records", "tax_records",
  "financial_accounts", "budgets",
  "messaging_config", "messaging_conversations", "messaging_messages",
  "messaging_templates", "messaging_quick_replies",
  "messaging_automations", "messaging_analytics",
]);

// Tables that don't have user_id (scoped via RLS only)
const NON_USER_SCOPED = new Set(["team_members", "attachments", "attachment_comments"]);

// ── Agent tools (OpenAI function-calling) ───────────────────
const TOOLS: any[] = [
  {
    type: "function",
    function: {
      name: "list_records",
      description:
        "List records from a CRM table with optional filtering, ordering, and pagination. Returns an array of records.",
      parameters: {
        type: "object",
        properties: {
          table: {
            type: "string",
            description: "The database table name, e.g. 'contacts', 'orders', 'products', 'deals', 'customers', etc.",
          },
          filters: {
            type: "array",
            description: "Optional filters. Each filter is {column, operator, value}. Operators: eq, neq, gt, gte, lt, lte, like, ilike, is, in.",
            items: {
              type: "object",
              properties: {
                column: { type: "string" },
                operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in"] },
                value: { type: "string" },
              },
              required: ["column", "operator", "value"],
            },
          },
          select: {
            type: "string",
            description: "Comma-separated columns to return. Default '*'.",
          },
          order: {
            type: "object",
            description: "Order by column.",
            properties: {
              column: { type: "string" },
              ascending: { type: "boolean" },
            },
          },
          limit: {
            type: "number",
            description: "Max rows to return. Default 25.",
          },
        },
        required: ["table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_record",
      description: "Get a single record by its ID from a CRM table.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "The database table name." },
          id: { type: "string", description: "The UUID of the record." },
          select: { type: "string", description: "Columns to return. Default '*'." },
        },
        required: ["table", "id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_record",
      description:
        "Create a new record in a CRM table. The user_id is automatically set. Returns the created record.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "The database table name." },
          data: {
            type: "object",
            description: "The record data as key-value pairs matching column names.",
            additionalProperties: true,
          },
        },
        required: ["table", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_record",
      description:
        "Update an existing record by ID. Only the provided fields are changed.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "The database table name." },
          id: { type: "string", description: "The UUID of the record to update." },
          data: {
            type: "object",
            description: "The fields to update as key-value pairs.",
            additionalProperties: true,
          },
        },
        required: ["table", "id", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_record",
      description: "Delete a record by ID from a CRM table.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "The database table name." },
          id: { type: "string", description: "The UUID of the record to delete." },
        },
        required: ["table", "id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_records",
      description:
        "Full-text search across one or more columns of a table using ILIKE. Good for finding records by name, email, title, etc.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "The database table name." },
          query: { type: "string", description: "The search term." },
          columns: {
            type: "array",
            items: { type: "string" },
            description: "Columns to search in with ILIKE, e.g. ['first_name', 'last_name', 'email'].",
          },
          limit: { type: "number", description: "Max rows. Default 10." },
        },
        required: ["table", "query", "columns"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_stats",
      description:
        "Get summary statistics for the CRM dashboard: total contacts, deals, orders, products, revenue, customers, open messaging conversations.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate_to",
      description:
        "Tell the user's browser to navigate to a CRM page. Use paths like '/dashboard', '/contacts', '/orders', '/deals/board', '/products', '/messaging', '/finance', '/stores', '/customers', '/settings'.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The CRM path to navigate to, e.g. '/contacts' or '/orders/show/some-uuid'." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_chat_message",
      description:
        "Send a reply message in a messaging conversation (web_chat or whatsapp) on behalf of the store owner. When recommending products, pass their IDs in productIds to automatically include product images and details.",
      parameters: {
        type: "object",
        properties: {
          conversationId: { type: "string", description: "UUID of the messaging conversation." },
          body: { type: "string", description: "The message text to send. Write in PLAIN TEXT — do NOT use markdown formatting like **bold** or *italic*, the customer chat does not render markdown." },
          productIds: { type: "array", items: { type: "string" }, description: "Optional array of product UUIDs to attach as product cards with images. Use this when suggesting/recommending products to a customer." },
        },
        required: ["conversationId", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Compose and send a new email from the user's email account. Creates the email record and sends it via SMTP.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "array", items: { type: "string" }, description: "Array of recipient email addresses." },
          subject: { type: "string", description: "Email subject line." },
          body: { type: "string", description: "HTML email body. Use simple HTML tags for formatting (p, br, strong, ul/li, etc.). Keep it professional." },
          cc: { type: "array", items: { type: "string" }, description: "Optional CC recipients." },
          bcc: { type: "array", items: { type: "string" }, description: "Optional BCC recipients." },
          category: { type: "string", enum: ["general", "order", "support", "marketing"], description: "Email category. Default: general." },
          contactId: { type: "string", description: "Optional UUID of a contact to link this email to." },
          customerId: { type: "string", description: "Optional UUID of a customer to link this email to." },
          orderId: { type: "string", description: "Optional UUID of an order to link this email to." },
          dealId: { type: "string", description: "Optional UUID of a deal to link this email to." },
          productIds: { type: "array", items: { type: "string" }, description: "Optional array of product UUIDs to include as clickable product cards with images in the email. Use when sharing available products." },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reply_email",
      description: "Reply to an existing email. Fetches the original email, creates a reply, and sends it via SMTP.",
      parameters: {
        type: "object",
        properties: {
          emailId: { type: "string", description: "UUID of the email to reply to." },
          body: { type: "string", description: "HTML body of the reply. Use simple HTML tags. Keep it professional." },
          replyAll: { type: "boolean", description: "If true, reply to all recipients (To + CC). Default: false." },
          productIds: { type: "array", items: { type: "string" }, description: "Optional array of product UUIDs to include as clickable product cards with images in the reply. Use when answering questions about available products." },
        },
        required: ["emailId", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_inbox_emails",
      description: "List emails in the inbox (or other folder). Returns unread emails first. Use this to check for new mail that needs responding to.",
      parameters: {
        type: "object",
        properties: {
          folder: { type: "string", enum: ["inbox", "sent", "drafts", "archive", "trash"], description: "Email folder. Default: inbox." },
          unreadOnly: { type: "boolean", description: "If true, only return unread emails. Default: false." },
          limit: { type: "number", description: "Max emails to return. Default: 10." },
          category: { type: "string", enum: ["general", "order", "support", "marketing"], description: "Optional category filter." },
        },
        required: [],
      },
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────
/** Strip markdown formatting so customer messages are plain text */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold** → bold
    .replace(/\*(.+?)\*/g, "$1")       // *italic* → italic
    .replace(/__(.+?)__/g, "$1")       // __bold__ → bold
    .replace(/_(.+?)_/g, "$1")         // _italic_ → italic
    .replace(/`(.+?)`/g, "$1")         // `code` → code
    .replace(/^#{1,6}\s+/gm, "")       // ### heading → heading
    .replace(/^[-*]\s/gm, "• ")        // - item → • item
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // [text](url) → text
}

/** Convert a store title to a URL slug (mirrors storefront toSlug) */
function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/** Build HTML product cards for email templates */
async function buildEmailProductCards(
  supabase: any,
  userId: string,
  productIds: string[],
): Promise<string> {
  // Fetch products with category name
  const { data: products } = await (supabase
    .from("products")
    .select("id, name, price, image_url, description, category_name")
    .eq("user_id", userId)
    .in as any)("id", productIds);

  if (!products?.length) return "";

  // Fetch the user's store to build storefront links
  const { data: store } = await supabase
    .from("stores")
    .select("id, title")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const storeSlug = store ? toSlug(store.title) : "";

  // Format price in GBP
  const fmtPrice = (p: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p);

  // Build each product card as a table cell (2 per row, side-by-side)
  const cardCells = products.map((prod: any) => {
    const productUrl = storeSlug ? `${appUrl}/store/${storeSlug}?product=${prod.id}` : "";

    const imgHtml = prod.image_url
      ? `<img src="${prod.image_url}" alt="${prod.name}" width="260" height="325" style="width:100%;height:325px;object-fit:cover;display:block;border-radius:16px 16px 0 0;" />`
      : `<div style="width:100%;height:325px;background:linear-gradient(135deg,#f3f4f6 0%,#e5e7eb 100%);border-radius:16px 16px 0 0;text-align:center;line-height:325px;color:#9ca3af;font-size:14px;">No image</div>`;

    const categoryHtml = prod.category_name
      ? `<p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;font-weight:600;">${prod.category_name}</p>`
      : "";

    const priceHtml = `<span style="font-size:16px;font-weight:700;color:#111827;">${fmtPrice(prod.price)}</span>`;

    const descHtml = prod.description
      ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;line-height:1.4;overflow:hidden;">${prod.description.slice(0, 80)}${prod.description.length > 80 ? "..." : ""}</p>`
      : "";

    const buttonHtml = productUrl
      ? `<div style="margin-top:16px;"><a href="${productUrl}" target="_blank" style="display:block;width:100%;padding:12px 0;background:#111827;color:#ffffff;text-decoration:none;border-radius:12px;font-size:13px;font-weight:600;text-align:center;letter-spacing:0.3px;">View Product</a></div>`
      : "";

    return `<td style="width:50%;padding:8px;vertical-align:top;">
      <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);border:1px solid #f3f4f6;">
        ${imgHtml}
        <div style="padding:16px 16px 20px;">
          ${categoryHtml}
          <h3 style="margin:0 0 6px;font-size:15px;font-weight:700;color:#111827;line-height:1.3;">${prod.name}</h3>
          <p style="margin:0;">${priceHtml}</p>
          ${descHtml}
          ${buttonHtml}
        </div>
      </div>
    </td>`;
  });

  // Arrange cards in rows of 2 (side-by-side)
  const rows: string[] = [];
  for (let i = 0; i < cardCells.length; i += 2) {
    const cell1 = cardCells[i];
    const cell2 = cardCells[i + 1] || '<td style="width:50%;padding:8px;"></td>';
    rows.push(`<tr>${cell1}${cell2}</tr>`);
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;max-width:600px;"><tbody>${rows.join("")}</tbody></table>`;
}

// ── System prompt ───────────────────────────────────────────
const SYSTEM_PROMPT = `You are **Phoxta Assistant**, an expert AI agent embedded inside the Phoxta CRM platform. You can perform any action the user can — managing contacts, companies, deals, orders, products, categories, stores, couriers, customers, staff, email, quotes, tasks, projects, finance, messaging, and more.

## Capabilities
You have access to tools that let you:
- **List, search, create, update, and delete** any CRM record
- **Fetch dashboard statistics** (totals, revenue, etc.)
- **Navigate** the user to any CRM page
- **Send messages** in the built-in messaging system
- **Read, compose, reply to, and manage emails** via the built-in email system

## Guidelines
1. **Be proactive**: When the user asks to do something, execute it immediately using tools. Don't just describe how — actually do it.
2. **Confirm destructive actions**: Before deleting or bulk-updating, briefly confirm with the user.
3. **Be concise**: Give clear, short responses. Show key details from tool results in a readable format.
4. **Multi-step tasks**: Chain multiple tool calls when needed (e.g., "create a product and add it to a category").
5. **Error handling**: If a tool call fails, explain the issue clearly and suggest alternatives.
6. **Context awareness**: Remember what the user has asked earlier in the conversation.
7. **Format nicely**: Use markdown for readability — bold for labels, lists for multiple items, tables for data.
8. **Customer messages**: When using send_chat_message, write in PLAIN TEXT only — never use markdown (no **bold**, no *italic*, no backtick-code). The customer chat widget renders raw text. When recommending products, always pass their IDs in the productIds parameter so the customer sees the product images.

## Database Schema Key Facts
- **contacts**: id, first_name, last_name, email, phone, company_id, job_title, stage (lead/prospect/customer/churned), status (active/inactive)
- **companies**: id, name, industry, address, city, country, website, total_revenue, size
- **deals**: id, title, company_id, contact_ids, stage_id, value, probability, close_date, status (won/lost/active)
- **pipeline_stages**: id, title, order
- **orders**: id, order_number, store_id, customer_id, amount, status (pending/confirmed/shipped/delivered/cancelled), payment_status
- **products**: id, name, description, price, category_id, category_name, is_active, image_url, stock
- **categories**: id, title, is_active
- **stores**: id, title, email, gsm, address, is_active, hero_*, brand colors
- **customers**: id, first_name, last_name, email, gsm, address
- **couriers**: id, name, url, gsm, description, is_active
- **quotes**: id, title, contact_id, company_id, total, status (draft/sent/accepted/rejected)
- **finance_transactions**: id, type (income/expense), amount, description, category, date, payment_method, status
- **messaging_conversations**: id, config_id, channel (web_chat/whatsapp), customer_name, customer_email, status (open/resolved), unread_count
- **messaging_messages**: id, conversation_id, direction (inbound/outbound), body, ai_generated
- **tasks**: id, title, description, stage_id, due_date, completed, project_id
- **projects**: id, title, description
- **staff**: id, first_name, last_name, email, role, status
- **email_accounts**: id, provider (gmail/outlook/smtp), email_address, display_name, smtp_host, smtp_port, is_default, is_active
- **emails**: id, account_id, from_address, from_name, to_addresses (JSONB array), cc_addresses, bcc_addresses, subject, body (HTML), snippet (plain text preview), status (draft/queued/sent/received/failed), category (general/order/support/marketing), folder (inbox/sent/drafts/trash/spam/archive), is_read, is_starred, has_attachments, message_id, in_reply_to, thread_id, contact_id, customer_id, order_id, deal_id, sent_at
- **email_templates**: id, name, subject, body, category, variables (JSONB), is_active
- All user-scoped tables have a user_id column that is set automatically.

## Email Guidelines
- Use send_email to compose and send new emails. The system automatically picks the user's default email account.
- Use reply_email to reply to received emails — it handles Re: subject, In-Reply-To headers, and quoting.
- Use list_inbox_emails with unreadOnly=true to check for new mail that needs attention.
- Email body is HTML — use <p>, <br>, <strong>, <ul>/<li> tags for professional formatting.
- When replying to customer inquiries, be professional, warm, and concise.
- Link emails to relevant CRM records (contacts, customers, orders, deals) when possible.
9. **Product emails**: When answering questions about available products via email (send_email or reply_email), always pass the product IDs in the productIds parameter. This auto-generates beautiful product cards with images and "View Product" links in the email — do NOT try to build product HTML yourself.

When listing records, default to a reasonable limit (10-25) unless the user asks for more.`;

// ── Tool execution ──────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, any>,
  userId: string,
): Promise<{ result: any; sideEffects?: { navigate?: string } }> {
  const supabase = createServiceRoleClient();

  switch (name) {
    case "list_records": {
      const { table, filters, select, order, limit } = args;
      if (!ALLOWED_TABLES.has(table)) {
        return { result: { error: `Table '${table}' is not accessible.` } };
      }
      let query = supabase.from(table).select(select || "*");
      if (!NON_USER_SCOPED.has(table)) {
        query = query.eq("user_id", userId);
      }
      if (filters?.length) {
        for (const f of filters) {
          if (f.operator === "in") {
            query = (query as any).in(f.column, f.value.split(",").map((v: string) => v.trim()));
          } else if (f.operator === "is") {
            query = query.is(f.column, f.value === "null" ? null : f.value);
          } else {
            query = query.filter(f.column, f.operator, f.value);
          }
        }
      }
      if (order?.column) {
        query = query.order(order.column, { ascending: order.ascending ?? false });
      } else {
        query = query.order("created_at", { ascending: false });
      }
      query = query.limit(limit || 25);
      const { data, error } = await query;
      if (error) return { result: { error: error.message } };
      return { result: { count: data?.length || 0, records: data || [] } };
    }

    case "get_record": {
      const { table, id, select } = args;
      if (!ALLOWED_TABLES.has(table)) {
        return { result: { error: `Table '${table}' is not accessible.` } };
      }
      let query = supabase.from(table).select(select || "*").eq("id", id);
      if (!NON_USER_SCOPED.has(table)) {
        query = query.eq("user_id", userId);
      }
      const { data, error } = await query.single();
      if (error) return { result: { error: error.message } };
      return { result: data };
    }

    case "create_record": {
      const { table, data } = args;
      if (!ALLOWED_TABLES.has(table)) {
        return { result: { error: `Table '${table}' is not accessible.` } };
      }
      const record = { ...data };
      if (!NON_USER_SCOPED.has(table)) {
        record.user_id = userId;
      }
      const { data: created, error } = await supabase
        .from(table)
        .insert(record)
        .select()
        .single();
      if (error) return { result: { error: error.message } };
      return { result: { success: true, record: created } };
    }

    case "update_record": {
      const { table, id, data } = args;
      if (!ALLOWED_TABLES.has(table)) {
        return { result: { error: `Table '${table}' is not accessible.` } };
      }
      let query = supabase.from(table).update(data).eq("id", id);
      if (!NON_USER_SCOPED.has(table)) {
        query = query.eq("user_id", userId);
      }
      const { data: updated, error } = await query.select().single();
      if (error) return { result: { error: error.message } };
      return { result: { success: true, record: updated } };
    }

    case "delete_record": {
      const { table, id } = args;
      if (!ALLOWED_TABLES.has(table)) {
        return { result: { error: `Table '${table}' is not accessible.` } };
      }
      let query = supabase.from(table).delete().eq("id", id);
      if (!NON_USER_SCOPED.has(table)) {
        query = query.eq("user_id", userId);
      }
      const { error } = await query;
      if (error) return { result: { error: error.message } };
      return { result: { success: true, deleted: id } };
    }

    case "search_records": {
      const { table, query: searchQuery, columns, limit } = args;
      if (!ALLOWED_TABLES.has(table)) {
        return { result: { error: `Table '${table}' is not accessible.` } };
      }
      // Build OR filter: col1.ilike.%q%,col2.ilike.%q%
      const pattern = `%${searchQuery}%`;
      const orClause = (columns || ["name"]).map((c: string) => `${c}.ilike.${pattern}`).join(",");
      let q = supabase.from(table).select("*").or(orClause);
      if (!NON_USER_SCOPED.has(table)) {
        q = q.eq("user_id", userId);
      }
      const { data, error } = await q.limit(limit || 10);
      if (error) return { result: { error: error.message } };
      return { result: { count: data?.length || 0, records: data || [] } };
    }

    case "get_dashboard_stats": {
      const counts = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("deals").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("messaging_conversations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "open"),
        supabase.from("orders").select("amount").eq("user_id", userId).eq("payment_status", "paid"),
      ]);
      const totalRevenue = (counts[6].data || []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
      return {
        result: {
          contacts: counts[0].count || 0,
          deals: counts[1].count || 0,
          orders: counts[2].count || 0,
          products: counts[3].count || 0,
          customers: counts[4].count || 0,
          openConversations: counts[5].count || 0,
          totalRevenue,
        },
      };
    }

    case "navigate_to": {
      return { result: { navigating: args.path }, sideEffects: { navigate: args.path } };
    }

    case "send_chat_message": {
      const { conversationId, body: rawBody, productIds } = args;
      // Strip any markdown the AI might have included
      const body = stripMarkdown(rawBody || "");

      // Get conversation to find the config and user ownership
      const { data: conv, error: convErr } = await supabase
        .from("messaging_conversations")
        .select("id, config_id, channel, user_id")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .single();
      if (convErr || !conv) return { result: { error: "Conversation not found." } };

      const now = new Date().toISOString();

      // 1. Send the main text message
      await supabase.from("messaging_messages").insert({
        user_id: userId,
        conversation_id: conversationId,
        channel: conv.channel,
        direction: "outbound",
        message_type: "text",
        body,
        status: "sent",
        ai_generated: true,
        sent_at: now,
        created_at: now,
      });

      // 2. If productIds provided, look up products and send image cards
      const sentProducts: { name: string; image: string | null }[] = [];
      if (Array.isArray(productIds) && productIds.length > 0) {
        const { data: products } = await (supabase
          .from("products")
          .select("id, name, price, image_url, description")
          .eq("user_id", userId)
          .in as any)("id", productIds);

        if (products?.length) {
          for (const prod of products) {
            const imgUrl = prod.image_url || "";
            const caption = `${prod.name} — £${prod.price}${prod.description ? "\n" + prod.description.slice(0, 120) : ""}`;
            // Insert an image message for each product
            const msgTime = new Date(Date.now() + sentProducts.length + 1).toISOString();
            await supabase.from("messaging_messages").insert({
              user_id: userId,
              conversation_id: conversationId,
              channel: conv.channel,
              direction: "outbound",
              message_type: imgUrl ? "image" : "text",
              body: imgUrl ? "" : caption,
              media_url: imgUrl || "",
              media_caption: imgUrl ? caption : "",
              interactive_data: { product_id: prod.id },
              status: "sent",
              ai_generated: true,
              sent_at: msgTime,
              created_at: msgTime,
            });
            sentProducts.push({ name: prod.name, image: imgUrl || null });
          }
        }
      }

      const preview = body.length > 100 ? body.slice(0, 100) + "..." : body;
      await supabase
        .from("messaging_conversations")
        .update({ last_message_at: new Date().toISOString(), last_message_preview: preview, unread_count: 0, updated_at: new Date().toISOString() })
        .eq("id", conversationId);
      return {
        result: {
          success: true,
          sent: body,
          productsAttached: sentProducts.length,
          products: sentProducts,
        },
      };
    }

    case "send_email": {
      const { to, subject, body: htmlBody, cc, bcc, category, contactId, customerId, orderId, dealId, productIds: emailProductIds } = args;
      // Get default email account
      const { data: account } = await supabase
        .from("email_accounts")
        .select("id, email_address, display_name, smtp_host, smtp_port, smtp_user, smtp_pass")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("is_default", true)
        .single();
      if (!account) {
        // Try any active account
        const { data: anyAccount } = await supabase
          .from("email_accounts")
          .select("id, email_address, display_name, smtp_host, smtp_port, smtp_user, smtp_pass")
          .eq("user_id", userId)
          .eq("is_active", true)
          .limit(1)
          .single();
        if (!anyAccount) return { result: { error: "No email account configured. Please set up an email account in Settings first." } };
        Object.assign(account || {}, anyAccount);
        if (!account) return { result: { error: "No email account configured." } };
      }

      const now = new Date().toISOString();

      // Build product cards if productIds provided
      let finalBody = htmlBody || "";
      if (Array.isArray(emailProductIds) && emailProductIds.length > 0) {
        const productCardsHtml = await buildEmailProductCards(supabase, userId, emailProductIds);
        if (productCardsHtml) finalBody += productCardsHtml;
      }

      const snippet = finalBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);

      // Create email record
      const { data: emailRec, error: createErr } = await supabase
        .from("emails")
        .insert({
          user_id: userId,
          account_id: account.id,
          from_address: account.email_address,
          from_name: account.display_name || "",
          to_addresses: to || [],
          cc_addresses: cc || [],
          bcc_addresses: bcc || [],
          subject: subject || "(No subject)",
          body: finalBody,
          snippet,
          status: "queued",
          category: category || "general",
          folder: "sent",
          is_read: true,
          contact_id: contactId || null,
          customer_id: customerId || null,
          order_id: orderId || null,
          deal_id: dealId || null,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();
      if (createErr) return { result: { error: "Failed to create email: " + createErr.message } };

      // Send via internal API (uses nodemailer)
      try {
        const sendRes = await fetch(new URL("/api/email/send", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailId: emailRec?.id,
            to,
            cc: cc || [],
            bcc: bcc || [],
            subject: subject || "(No subject)",
            body: finalBody,
            fromAddress: account.email_address,
            fromName: account.display_name || "",
            accountId: account.id,
            userId, // service-role auth
          }),
        });
        if (!sendRes.ok) {
          const errBody = await sendRes.json().catch(() => ({}));
          // Mark as failed
          await supabase.from("emails").update({ status: "failed", error_message: errBody.error || "Send failed" }).eq("id", emailRec?.id);
          return { result: { error: errBody.details || errBody.error || "Failed to send email via SMTP" } };
        }
        return { result: { success: true, emailId: emailRec?.id, sent_to: to, subject, productsAttached: (emailProductIds || []).length } };
      } catch (err: any) {
        await supabase.from("emails").update({ status: "failed", error_message: err.message || "Network error" }).eq("id", emailRec?.id);
        return { result: { error: "Failed to send email: " + (err.message || "Network error") } };
      }
    }

    case "reply_email": {
      const { emailId, body: replyHtml, replyAll, productIds: replyProductIds } = args;
      // Get original email
      const { data: orig, error: origErr } = await supabase
        .from("emails")
        .select("id, from_address, from_name, to_addresses, cc_addresses, subject, body, message_id, thread_id, account_id, contact_id, customer_id, order_id, deal_id")
        .eq("id", emailId)
        .eq("user_id", userId)
        .single();
      if (origErr || !orig) return { result: { error: "Original email not found." } };

      // Get sender's email account
      let accountId = orig.account_id;
      if (!accountId) {
        const { data: defAcc } = await supabase
          .from("email_accounts")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .eq("is_default", true)
          .single();
        accountId = defAcc?.id;
      }
      if (!accountId) {
        const { data: anyAcc } = await supabase
          .from("email_accounts")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .limit(1)
          .single();
        accountId = anyAcc?.id;
      }
      if (!accountId) return { result: { error: "No email account configured." } };

      const { data: account } = await supabase
        .from("email_accounts")
        .select("id, email_address, display_name")
        .eq("id", accountId)
        .single();
      if (!account) return { result: { error: "Email account not found." } };

      // Build reply recipients
      const replyTo = (orig.from_address && orig.from_address !== account.email_address)
        ? [orig.from_address]
        : (orig.to_addresses || []).filter((a: string) => a !== account.email_address);

      let ccList: string[] = [];
      if (replyAll) {
        const allRecipients = [...(orig.to_addresses || []), ...(orig.cc_addresses || [])];
        ccList = allRecipients.filter((a: string) =>
          a !== account.email_address && !replyTo.includes(a)
        );
      }

      const replySubject = orig.subject?.startsWith("Re: ") ? orig.subject : `Re: ${orig.subject || ""}`;

      // Build product cards if productIds provided
      let replyBody = replyHtml;
      if (Array.isArray(replyProductIds) && replyProductIds.length > 0) {
        const productCardsHtml = await buildEmailProductCards(supabase, userId, replyProductIds);
        if (productCardsHtml) replyBody += productCardsHtml;
      }

      // Build quoted original
      const quotedBody = `${replyBody}<br><br><div style="border-left:2px solid #ccc;padding-left:12px;margin-top:16px;color:#666;"><p><strong>On ${new Date().toLocaleDateString()}, ${orig.from_name || orig.from_address} wrote:</strong></p>${orig.body || ""}</div>`;

      const now = new Date().toISOString();
      const snippet = replyBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);

      const { data: emailRec, error: createErr } = await supabase
        .from("emails")
        .insert({
          user_id: userId,
          account_id: accountId,
          from_address: account.email_address,
          from_name: account.display_name || "",
          to_addresses: replyTo,
          cc_addresses: ccList,
          bcc_addresses: [],
          subject: replySubject,
          body: quotedBody,
          snippet,
          status: "queued",
          category: "general",
          folder: "sent",
          is_read: true,
          in_reply_to: orig.message_id || null,
          thread_id: orig.thread_id || orig.message_id || null,
          contact_id: orig.contact_id || null,
          customer_id: orig.customer_id || null,
          order_id: orig.order_id || null,
          deal_id: orig.deal_id || null,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();
      if (createErr) return { result: { error: "Failed to create reply: " + createErr.message } };

      try {
        const sendRes = await fetch(new URL("/api/email/send", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailId: emailRec?.id,
            to: replyTo,
            cc: ccList,
            bcc: [],
            subject: replySubject,
            body: quotedBody,
            fromAddress: account.email_address,
            fromName: account.display_name || "",
            accountId: accountId,
            userId, // service-role auth
          }),
        });
        if (!sendRes.ok) {
          const errBody = await sendRes.json().catch(() => ({}));
          await supabase.from("emails").update({ status: "failed", error_message: errBody.error || "Send failed" }).eq("id", emailRec?.id);
          return { result: { error: errBody.details || errBody.error || "Failed to send reply via SMTP" } };
        }
        // Mark original email as read
        await supabase.from("emails").update({ is_read: true }).eq("id", emailId);
        return { result: { success: true, emailId: emailRec?.id, replied_to: replyTo, subject: replySubject } };
      } catch (err: any) {
        await supabase.from("emails").update({ status: "failed", error_message: err.message || "Network error" }).eq("id", emailRec?.id);
        return { result: { error: "Failed to send reply: " + (err.message || "Network error") } };
      }
    }

    case "list_inbox_emails": {
      const { folder, unreadOnly, limit: maxEmails, category } = args;
      let query = supabase
        .from("emails")
        .select("id, from_address, from_name, to_addresses, subject, snippet, status, category, folder, is_read, is_starred, has_attachments, contact_id, customer_id, order_id, deal_id, sent_at, created_at")
        .eq("user_id", userId)
        .eq("folder", folder || "inbox");

      if (unreadOnly) query = query.eq("is_read", false);
      if (category) query = query.eq("category", category);

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(maxEmails || 10);

      if (error) return { result: { error: "Failed to list emails: " + error.message } };
      return { result: { emails: data || [], total: (data || []).length } };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` } };
  }
}

// ── Streaming POST handler ──────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages, userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Agentic loop — keep going until the model produces a final text response
    let currentMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages,
    ];

    const encoder = new TextEncoder();
    const sideEffects: Array<{ navigate?: string }> = [];

    const stream = new ReadableStream({
      async start(controller) {
        const MAX_ITERATIONS = 10;
        let iteration = 0;

        try {
          while (iteration++ < MAX_ITERATIONS) {
            const response = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              temperature: 0.3,
              max_tokens: 2048,
              messages: currentMessages,
              tools: TOOLS,
              tool_choice: "auto",
            });

            const choice = response.choices[0];
            const message = choice.message;

            // If the model wants to call tools
            if (message.tool_calls && message.tool_calls.length > 0) {
              // Send a status event so the UI can show tool execution
              for (const tc of message.tool_calls) {
                const fn = (tc as any).function;
                const statusEvent = {
                  type: "tool_start",
                  tool: fn.name,
                  args: JSON.parse(fn.arguments || "{}"),
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(statusEvent)}\n\n`));
              }

              // Add assistant message with tool_calls
              currentMessages.push(message as any);

              // Execute all tool calls in parallel
              const toolResults = await Promise.all(
                message.tool_calls.map(async (tc) => {
                  const fn = (tc as any).function;
                  const args = JSON.parse(fn.arguments || "{}");
                  const { result, sideEffects: se } = await executeTool(fn.name, args, userId);
                  if (se) sideEffects.push(se);
                  return {
                    role: "tool" as const,
                    tool_call_id: tc.id,
                    content: JSON.stringify(result),
                  };
                }),
              );

              // Send tool results status
              for (const tr of toolResults) {
                const parsed = JSON.parse(tr.content);
                const resultEvent = {
                  type: "tool_result",
                  tool_call_id: tr.tool_call_id,
                  result: parsed,
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(resultEvent)}\n\n`));
              }

              // Add tool results to messages
              currentMessages.push(...(toolResults as any[]));

              // Continue loop — model will process tool results
              continue;
            }

            // No tool calls — final text response
            if (message.content) {
              // Stream the text token by token (simulate with chunks)
              const text = message.content;
              const chunkSize = 4;
              for (let i = 0; i < text.length; i += chunkSize) {
                const chunk = text.slice(i, i + chunkSize);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`),
                );
              }
            }

            // Send side effects (e.g., navigation)
            if (sideEffects.length > 0) {
              for (const se of sideEffects) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "side_effect", ...se })}\n\n`),
                );
              }
            }

            // Done
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            break;
          }

          if (iteration > MAX_ITERATIONS) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", content: "I hit the maximum number of steps. Please try a simpler request." })}\n\n`,
              ),
            );
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          }
        } catch (err: any) {
          console.error("Phoxta Assistant error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: err?.message || "Something went wrong" })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    console.error("Assistant route error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
