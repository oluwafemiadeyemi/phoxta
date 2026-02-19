import { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";

/* ═══════════════════════════════════════════════════════════
   Phoxta Assistant — Autopilot Tick
   Called periodically by the frontend when autopilot is ON.
   Scans for pending CRM work, lets the AI decide what to do,
   executes actions, and returns a log of everything it did.
   ═══════════════════════════════════════════════════════════ */

interface AutopilotAction {
  type: string;
  description: string;
  details?: Record<string, any>;
  timestamp: string;
}

// ── Gather pending work across the CRM ──────────────────────
async function gatherPendingWork(userId: string) {
  const supabase = createServiceRoleClient();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Run all scans in parallel
  const [
    unreadConvos,
    pendingOrders,
    overdueTasks,
    newLeads,
    draftQuotes,
    openDeals,
    lowStockProducts,
    unreadEmails,
  ] = await Promise.all([
    // 1. Unread messaging conversations
    supabase
      .from("messaging_conversations")
      .select("id, customer_name, customer_email, channel, unread_count, last_message_preview, last_message_at, status")
      .eq("user_id", userId)
      .eq("status", "open")
      .gt("unread_count", 0)
      .order("last_message_at", { ascending: false })
      .limit(10),

    // 2. Pending orders that need confirmation
    supabase
      .from("orders")
      .select("id, order_number, amount, status, payment_status, customer_id, created_at")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),

    // 3. Overdue or due-today tasks
    supabase
      .from("tasks")
      .select("id, title, description, due_date, completed, project_id")
      .eq("user_id", userId)
      .eq("completed", false)
      .lte("due_date", todayStr)
      .order("due_date", { ascending: true })
      .limit(10),

    // 4. New leads (contacts in 'lead' stage, created in last 24h)
    supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone, stage, created_at")
      .eq("user_id", userId)
      .eq("stage", "lead")
      .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(10),

    // 5. Draft quotes that haven't been sent
    supabase
      .from("quotes")
      .select("id, title, contact_id, company_id, total, status, created_at")
      .eq("user_id", userId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(5),

    // 6. Active deals close to their close_date
    supabase
      .from("deals")
      .select("id, title, value, probability, close_date, status, company_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .lte("close_date", new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .order("close_date", { ascending: true })
      .limit(5),

    // 7. Low stock products (stock <= 5 and active)
    supabase
      .from("products")
      .select("id, name, stock, price, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .lte("stock", 5)
      .order("stock", { ascending: true })
      .limit(10),

    // 8. Unread emails in inbox
    supabase
      .from("emails")
      .select("id, from_address, from_name, to_addresses, subject, snippet, category, is_read, is_starred, contact_id, customer_id, order_id, deal_id, created_at")
      .eq("user_id", userId)
      .eq("folder", "inbox")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Filter out emails from no-reply / automated senders that don't need a response
  const NO_REPLY_PATTERNS = [
    /no[-_]?reply/i, /noreply/i, /do[-_]?not[-_]?reply/i,
    /mailer[-_]?daemon/i, /postmaster@/i, /notification[s]?@/i,
    /alert[s]?@/i, /newsletter[s]?@/i, /marketing@/i,
    /updates?@/i, /info@.*\.google\.com/i, /feedback@/i,
    /bounce[s]?@/i, /auto[-_]?reply/i, /system@/i,
  ];
  const filteredEmails = (unreadEmails.data || []).filter((e: any) => {
    const addr = (e.from_address || "").toLowerCase();
    return !NO_REPLY_PATTERNS.some((p) => p.test(addr));
  });

  return {
    unreadConversations: unreadConvos.data || [],
    pendingOrders: pendingOrders.data || [],
    overdueTasks: overdueTasks.data || [],
    newLeads: newLeads.data || [],
    draftQuotes: draftQuotes.data || [],
    urgentDeals: openDeals.data || [],
    lowStockProducts: lowStockProducts.data || [],
    unreadEmails: filteredEmails,
  };
}

// ── Build autopilot context for the AI ──────────────────────
function buildAutopilotPrompt(work: Awaited<ReturnType<typeof gatherPendingWork>>) {
  const sections: string[] = [];

  if (work.unreadConversations.length > 0) {
    sections.push(`## Unread Messages (${work.unreadConversations.length})
${work.unreadConversations.map((c: any) =>
  `- Conversation ${c.id}: ${c.customer_name || c.customer_email || "Unknown"} (${c.channel}) — ${c.unread_count} unread — Last: "${c.last_message_preview || ""}"`
).join("\n")}`);
  }

  if (work.pendingOrders.length > 0) {
    sections.push(`## Pending Orders (${work.pendingOrders.length})
${work.pendingOrders.map((o: any) =>
  `- Order #${o.order_number} (${o.id}): $${o.amount} — Status: ${o.status}, Payment: ${o.payment_status}`
).join("\n")}`);
  }

  if (work.overdueTasks.length > 0) {
    sections.push(`## Overdue/Due Today Tasks (${work.overdueTasks.length})
${work.overdueTasks.map((t: any) =>
  `- Task ${t.id}: "${t.title}" — Due: ${t.due_date}`
).join("\n")}`);
  }

  if (work.newLeads.length > 0) {
    sections.push(`## New Leads (last 24h) (${work.newLeads.length})
${work.newLeads.map((c: any) =>
  `- ${c.first_name} ${c.last_name} (${c.email || "no email"}) — ${c.phone || "no phone"}`
).join("\n")}`);
  }

  if (work.draftQuotes.length > 0) {
    sections.push(`## Draft Quotes (${work.draftQuotes.length})
${work.draftQuotes.map((q: any) =>
  `- Quote ${q.id}: "${q.title}" — Total: $${q.total}`
).join("\n")}`);
  }

  if (work.urgentDeals.length > 0) {
    sections.push(`## Deals Closing Soon (${work.urgentDeals.length})
${work.urgentDeals.map((d: any) =>
  `- Deal ${d.id}: "${d.title}" — Value: $${d.value} — Close: ${d.close_date} — Probability: ${d.probability}%`
).join("\n")}`);
  }

  if (work.lowStockProducts.length > 0) {
    sections.push(`## Low Stock Products (${work.lowStockProducts.length})
${work.lowStockProducts.map((p: any) =>
  `- Product ${p.id}: "${p.name}" — Stock: ${p.stock} — Price: $${p.price}`
).join("\n")}`);
  }

  if (work.unreadEmails.length > 0) {
    sections.push(`## Unread Emails (${work.unreadEmails.length})
${work.unreadEmails.map((e: any) =>
  `- Email ${e.id}: From: ${e.from_name || e.from_address} <${e.from_address}> — Subject: "${e.subject}" — Category: ${e.category} — Preview: "${e.snippet || ""}"`
).join("\n")}`);
  }

  if (sections.length === 0) {
    return null; // Nothing to do
  }

  return sections.join("\n\n");
}

const AUTOPILOT_SYSTEM = `You are **Phoxta Autopilot**, an autonomous AI agent managing a CRM.
You are running in AUTOPILOT MODE — you must take action on pending work WITHOUT asking the user.

## Your responsibilities:
1. **Reply to unread messages** — Compose professional, helpful replies to customer messages. Use the send_chat_message tool. Be friendly and address their question/concern directly. When a customer asks about products, use list_records on the "products" table to find relevant products, then pass their IDs in the productIds parameter so the customer receives product cards with images.
2. **Reply to unread emails** — Compose professional, helpful replies to incoming emails. Use the reply_email tool. Be warm, concise, and address the sender's question or concern. Write the body in clean HTML. When responding about available products, first use list_records on the "products" table to find products, then pass their IDs in the productIds parameter of reply_email so the customer receives beautiful product cards with images and direct links to the store.
3. **Send proactive emails** — Use send_email to send outreach emails when appropriate (e.g. welcome emails to new leads, order confirmations).
4. **Confirm pending orders** — Update order status from "pending" to "confirmed" for orders with paid/successful payment.
5. **Handle overdue tasks** — Mark tasks as completed if they appear done, or note them in your report.
6. **Create records** — Use create_record to create contacts, tasks, deals, or other records as needed.
7. **Search & lookup** — Use list_records, get_record, and search_records to find any CRM data you need to make informed decisions.
8. **Dashboard overview** — Use get_dashboard_stats to get a quick overview if you need context about the business state.
9. **Acknowledge new leads** — Note new leads in your report. If they have email, consider sending a welcome email with send_email.
10. **Flag urgent deals** — Note deals closing soon in your report with recommended follow-up actions.
11. **Flag low stock** — Note products with low stock that need restocking.
12. **Draft quotes** — Note draft quotes that should be reviewed and sent.

## Database key facts:
- Products: id, name, description, price, stock, is_active, image_url, category_id, category_name
- Orders: id, order_number, status (pending/confirmed/processing/shipped/delivered/cancelled), payment_status, amount, customer_id
- Contacts: id, name, email, phone, company_id, tags
- Deals: id, title, value, stage_id, contact_id, expected_close_date
- Emails: id, from_address, to_addresses, subject, body, folder, is_read, category, contact_id, customer_id, order_id
- Customers: id, name, email, phone
- Tasks: id, title, status, due_date, assignee_id, project_id

## Rules:
- **ALWAYS take action** when you can (reply to messages, confirm paid orders, send emails).
- **NEVER delete** anything in autopilot mode.
- **Do NOT reply to emails that don't require a response.** This includes: newsletters, marketing blasts, automated notifications, receipts, shipping confirmations, system alerts, subscription updates, social media notifications, password reset emails, promotional offers from other companies, and any email that is clearly informational with no question or action needed. Simply mark these as read using update_record on the emails table (set is_read to true) and note them in your summary as "Skipped (no response needed)".
- **Be professional** in all message and email replies — represent the business well.
- Keep customer replies concise, warm, and helpful.
- When sending chat messages, write plain text only (no markdown, no bold, no links).
- When sending emails, write clean HTML.
- When a customer asks about products, ALWAYS use list_records first to fetch product data, then include productIds in your send_chat_message or reply_email call.
- For each action you take, include it in your final summary.
- If there's nothing to do, respond with "All clear — nothing needs attention right now."

## Response format:
After taking all actions, provide a brief summary of what you did, formatted as a bulleted list. Each bullet should describe one action taken.`;

// ── Allowed tables (same as main assistant) ─────────────────
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

const NON_USER_SCOPED = new Set(["team_members", "attachments", "attachment_comments"]);

// ── Tool definitions (full suite for autopilot) ─────────────
const AUTOPILOT_TOOLS: any[] = [
  {
    type: "function",
    function: {
      name: "list_records",
      description: "List records from a CRM table with optional filtering, ordering, and pagination.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "The database table name, e.g. 'contacts', 'orders', 'products', 'deals', 'customers', etc." },
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
          select: { type: "string", description: "Comma-separated columns to return. Default '*'." },
          order: {
            type: "object",
            description: "Order by column.",
            properties: { column: { type: "string" }, ascending: { type: "boolean" } },
          },
          limit: { type: "number", description: "Max rows to return. Default 25." },
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
      description: "Create a new record in a CRM table. The user_id is automatically set.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "The database table name." },
          data: { type: "object", description: "The record data as key-value pairs.", additionalProperties: true },
        },
        required: ["table", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_record",
      description: "Update an existing record by ID. Only the provided fields are changed.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string" },
          id: { type: "string" },
          data: { type: "object", additionalProperties: true },
        },
        required: ["table", "id", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_records",
      description: "Full-text search across one or more columns of a table using ILIKE. Good for finding records by name, email, title, etc.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "The database table name." },
          query: { type: "string", description: "The search term." },
          columns: { type: "array", items: { type: "string" }, description: "Columns to search in with ILIKE." },
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
      description: "Get summary statistics for the CRM dashboard: total contacts, deals, orders, products, revenue, customers, open conversations.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "send_chat_message",
      description: "Send a reply to a messaging conversation. When recommending products, pass their IDs in productIds.",
      parameters: {
        type: "object",
        properties: {
          conversationId: { type: "string" },
          body: { type: "string", description: "The message text. Write in PLAIN TEXT only — no markdown." },
          productIds: { type: "array", items: { type: "string" }, description: "Optional array of product UUIDs to attach as product cards with images." },
        },
        required: ["conversationId", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_messages",
      description: "Get recent messages from a conversation to understand the context before replying.",
      parameters: {
        type: "object",
        properties: {
          conversationId: { type: "string" },
          limit: { type: "number", description: "Max messages. Default 10." },
        },
        required: ["conversationId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Compose and send a new email. The system automatically picks the user's default email account.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "array", items: { type: "string" }, description: "Array of recipient email addresses." },
          subject: { type: "string", description: "Email subject line." },
          body: { type: "string", description: "HTML email body. Use simple HTML tags for formatting." },
          cc: { type: "array", items: { type: "string" }, description: "Optional CC recipients." },
          bcc: { type: "array", items: { type: "string" }, description: "Optional BCC recipients." },
          category: { type: "string", enum: ["general", "order", "support", "marketing"], description: "Email category. Default: general." },
          contactId: { type: "string", description: "Optional UUID of a contact to link this email to." },
          customerId: { type: "string", description: "Optional UUID of a customer to link this email to." },
          orderId: { type: "string", description: "Optional UUID of an order to link this email to." },
          dealId: { type: "string", description: "Optional UUID of a deal to link this email to." },
          productIds: { type: "array", items: { type: "string" }, description: "Optional array of product UUIDs to include as clickable product cards." },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reply_email",
      description: "Reply to an existing email. Fetches the original, creates a reply with quoted original, and sends via SMTP.",
      parameters: {
        type: "object",
        properties: {
          emailId: { type: "string", description: "UUID of the email to reply to." },
          body: { type: "string", description: "HTML body of the reply. Use simple HTML tags." },
          productIds: { type: "array", items: { type: "string" }, description: "Optional array of product UUIDs to include as clickable product cards." },
        },
        required: ["emailId", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_inbox_emails",
      description: "List emails in the inbox (or other folder). Use with unreadOnly=true to check for new mail.",
      parameters: {
        type: "object",
        properties: {
          folder: { type: "string", enum: ["inbox", "sent", "drafts", "archive", "trash"], description: "Email folder. Default: inbox." },
          unreadOnly: { type: "boolean", description: "If true, only return unread emails." },
          limit: { type: "number", description: "Max emails to return. Default: 10." },
          category: { type: "string", enum: ["general", "order", "support", "marketing"], description: "Optional category filter." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_email",
      description: "Get the full content of an email by its ID to understand context before replying.",
      parameters: {
        type: "object",
        properties: {
          emailId: { type: "string", description: "UUID of the email to read." },
        },
        required: ["emailId"],
      },
    },
  },
];

/** Strip markdown formatting so customer messages are plain text */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s/gm, "• ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

/** Convert a store title to a URL slug */
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

// ── Execute autopilot tool ──────────────────────────────────
async function executeAutopilotTool(
  name: string,
  args: Record<string, any>,
  userId: string,
): Promise<any> {
  const supabase = createServiceRoleClient();

  switch (name) {
    // ── Generic CRUD ──────────────────────────────────────────
    case "list_records": {
      const { table, filters, select, order, limit } = args;
      if (!ALLOWED_TABLES.has(table)) return { error: `Table '${table}' is not accessible.` };
      let query = supabase.from(table).select(select || "*");
      if (!NON_USER_SCOPED.has(table)) query = query.eq("user_id", userId);
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
      if (error) return { error: error.message };
      return { count: data?.length || 0, records: data || [] };
    }

    case "get_record": {
      const { table, id, select } = args;
      if (!ALLOWED_TABLES.has(table)) return { error: `Table '${table}' is not accessible.` };
      let query = supabase.from(table).select(select || "*").eq("id", id);
      if (!NON_USER_SCOPED.has(table)) query = query.eq("user_id", userId);
      const { data, error } = await query.single();
      if (error) return { error: error.message };
      return data;
    }

    case "create_record": {
      const { table, data } = args;
      if (!ALLOWED_TABLES.has(table)) return { error: `Table '${table}' is not accessible.` };
      const record = { ...data };
      if (!NON_USER_SCOPED.has(table)) record.user_id = userId;
      const { data: created, error } = await supabase.from(table).insert(record).select().single();
      if (error) return { error: error.message };
      return { success: true, record: created };
    }

    case "update_record": {
      const { table, id, data } = args;
      if (!ALLOWED_TABLES.has(table)) return { error: `Table '${table}' is not accessible.` };
      const safeData = { ...data };
      delete safeData.user_id;
      delete safeData.id;
      let query = supabase.from(table).update(safeData).eq("id", id);
      if (!NON_USER_SCOPED.has(table)) query = query.eq("user_id", userId);
      const { data: updated, error } = await query.select().single();
      if (error) return { error: error.message };
      return { success: true, record: updated };
    }

    case "search_records": {
      const { table, query: searchQuery, columns, limit } = args;
      if (!ALLOWED_TABLES.has(table)) return { error: `Table '${table}' is not accessible.` };
      const pattern = `%${searchQuery}%`;
      const orClause = (columns || ["name"]).map((c: string) => `${c}.ilike.${pattern}`).join(",");
      let q = supabase.from(table).select("*").or(orClause);
      if (!NON_USER_SCOPED.has(table)) q = q.eq("user_id", userId);
      const { data, error } = await q.limit(limit || 10);
      if (error) return { error: error.message };
      return { count: data?.length || 0, records: data || [] };
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
        contacts: counts[0].count || 0,
        deals: counts[1].count || 0,
        orders: counts[2].count || 0,
        products: counts[3].count || 0,
        customers: counts[4].count || 0,
        openConversations: counts[5].count || 0,
        totalRevenue,
      };
    }

    // ── Messaging ─────────────────────────────────────────────
    case "send_chat_message": {
      const { conversationId, body: rawBody, productIds } = args;
      const body = stripMarkdown(rawBody || "");
      const { data: conv } = await supabase
        .from("messaging_conversations")
        .select("id, channel, user_id")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .single();
      if (!conv) return { error: "Conversation not found." };

      const now = new Date().toISOString();
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

      // Send product image cards if productIds provided
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
      return { success: true, message: "Replied to conversation", productsAttached: sentProducts.length, products: sentProducts };
    }

    case "get_messages": {
      const { conversationId, limit } = args;
      const { data, error } = await supabase
        .from("messaging_messages")
        .select("id, direction, body, ai_generated, created_at")
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit || 10);
      if (error) return { error: error.message };
      return { messages: (data || []).reverse() };
    }

    // ── Email ─────────────────────────────────────────────────
    case "send_email": {
      const { to, subject, body: htmlBody, cc, bcc, category, contactId, customerId, orderId, dealId, productIds: emailProductIds } = args;
      const { data: account } = await supabase
        .from("email_accounts")
        .select("id, email_address, display_name")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("is_default", true)
        .single();
      let acct = account;
      if (!acct) {
        const { data: anyAcc } = await supabase
          .from("email_accounts")
          .select("id, email_address, display_name")
          .eq("user_id", userId)
          .eq("is_active", true)
          .limit(1)
          .single();
        acct = anyAcc;
      }
      if (!acct) return { error: "No email account configured." };

      let finalBody = htmlBody || "";
      if (Array.isArray(emailProductIds) && emailProductIds.length > 0) {
        const productCardsHtml = await buildEmailProductCards(supabase, userId, emailProductIds);
        if (productCardsHtml) finalBody += productCardsHtml;
      }

      const now = new Date().toISOString();
      const snippet = finalBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
      const { data: emailRec, error: createErr } = await supabase
        .from("emails")
        .insert({
          user_id: userId,
          account_id: acct.id,
          from_address: acct.email_address,
          from_name: acct.display_name || "",
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
      if (createErr) return { error: "Failed to create email: " + createErr.message };

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
            fromAddress: acct.email_address,
            fromName: acct.display_name || "",
            accountId: acct.id,
            userId,
          }),
        });
        if (!sendRes.ok) {
          const errBody = await sendRes.json().catch(() => ({}));
          await supabase.from("emails").update({ status: "failed", error_message: errBody.error || "Send failed" }).eq("id", emailRec?.id);
          return { error: errBody.details || errBody.error || "Failed to send email via SMTP" };
        }
        return { success: true, emailId: emailRec?.id, sent_to: to, subject, productsAttached: (emailProductIds || []).length };
      } catch (err: any) {
        await supabase.from("emails").update({ status: "failed", error_message: err.message || "Network error" }).eq("id", emailRec?.id);
        return { error: "Failed to send email: " + (err.message || "Network error") };
      }
    }

    case "reply_email": {
      const { emailId, body: replyHtml, productIds: replyProductIds } = args;
      const { data: orig, error: origErr } = await supabase
        .from("emails")
        .select("id, from_address, from_name, to_addresses, cc_addresses, subject, body, message_id, thread_id, account_id, contact_id, customer_id, order_id, deal_id")
        .eq("id", emailId)
        .eq("user_id", userId)
        .single();
      if (origErr || !orig) return { error: "Original email not found." };

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
      if (!accountId) return { error: "No email account configured." };

      const { data: sendAcct } = await supabase
        .from("email_accounts")
        .select("id, email_address, display_name")
        .eq("id", accountId)
        .single();
      if (!sendAcct) return { error: "Email account not found." };

      const replyTo = (orig.from_address && orig.from_address !== sendAcct.email_address)
        ? [orig.from_address]
        : (orig.to_addresses || []).filter((a: string) => a !== sendAcct.email_address);
      const replySubject = orig.subject?.startsWith("Re: ") ? orig.subject : `Re: ${orig.subject || ""}`;

      let replyBody = replyHtml;
      if (Array.isArray(replyProductIds) && replyProductIds.length > 0) {
        const productCardsHtml = await buildEmailProductCards(supabase, userId, replyProductIds);
        if (productCardsHtml) replyBody += productCardsHtml;
      }

      const quotedBody = `${replyBody}<br><br><div style="border-left:2px solid #ccc;padding-left:12px;margin-top:16px;color:#666;"><p><strong>On ${new Date().toLocaleDateString()}, ${orig.from_name || orig.from_address} wrote:</strong></p>${orig.body || ""}</div>`;
      const nowStr = new Date().toISOString();
      const snippet = replyBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);

      const { data: emailRec, error: createErr } = await supabase
        .from("emails")
        .insert({
          user_id: userId,
          account_id: accountId,
          from_address: sendAcct.email_address,
          from_name: sendAcct.display_name || "",
          to_addresses: replyTo,
          cc_addresses: [],
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
          created_at: nowStr,
          updated_at: nowStr,
        })
        .select("id")
        .single();
      if (createErr) return { error: "Failed to create reply: " + createErr.message };

      try {
        const sendRes = await fetch(new URL("/api/email/send", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailId: emailRec?.id,
            to: replyTo,
            cc: [],
            bcc: [],
            subject: replySubject,
            body: quotedBody,
            fromAddress: sendAcct.email_address,
            fromName: sendAcct.display_name || "",
            accountId,
            userId,
          }),
        });
        if (!sendRes.ok) {
          const errBody = await sendRes.json().catch(() => ({}));
          await supabase.from("emails").update({ status: "failed", error_message: errBody.error || "Send failed" }).eq("id", emailRec?.id);
          return { error: errBody.details || errBody.error || "Failed to send reply via SMTP" };
        }
        await supabase.from("emails").update({ is_read: true }).eq("id", emailId);
        return { success: true, emailId: emailRec?.id, replied_to: replyTo, subject: replySubject };
      } catch (err: any) {
        await supabase.from("emails").update({ status: "failed", error_message: err.message || "Network error" }).eq("id", emailRec?.id);
        return { error: "Failed to send reply: " + (err.message || "Network error") };
      }
    }

    case "list_inbox_emails": {
      const { folder, limit, unreadOnly } = args;
      let query = supabase
        .from("emails")
        .select("id, from_address, from_name, to_addresses, subject, snippet, category, status, folder, is_read, created_at, contact_id, customer_id, order_id, deal_id")
        .eq("user_id", userId)
        .eq("folder", folder || "inbox");
      if (unreadOnly) query = query.eq("is_read", false);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(limit || 20);
      if (error) return { error: error.message };
      return { count: data?.length || 0, emails: data || [] };
    }

    case "get_email": {
      const { emailId } = args;
      const { data, error } = await supabase
        .from("emails")
        .select("id, from_address, from_name, to_addresses, cc_addresses, subject, body, snippet, category, status, folder, is_read, message_id, thread_id, contact_id, customer_id, order_id, deal_id, created_at")
        .eq("id", emailId)
        .eq("user_id", userId)
        .single();
      if (error) return { error: error.message };
      return { email: data };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Sync emails via IMAP for a user ─────────────────────────
async function syncEmailsForUser(userId: string) {
  try {
    const supabase = createServiceRoleClient();
    const { data: accounts } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts?.length) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await Promise.all(
      accounts.map(async (acct: any) => {
        try {
          await fetch(new URL("/api/email/fetch", appUrl), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountId: acct.id, userId }),
          });
        } catch {
          // Silent — don't block autopilot if email sync fails
        }
      }),
    );
  } catch {
    // Silent — email sync is best-effort
  }
}

// ── POST handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 0. Sync emails from IMAP before scanning
    await syncEmailsForUser(userId);

    // 1. Gather all pending work
    const work = await gatherPendingWork(userId);
    const workSummary = buildAutopilotPrompt(work);

    // Nothing to do
    if (!workSummary) {
      return Response.json({
        actions: [],
        summary: "All clear — nothing needs attention right now.",
        scannedAt: new Date().toISOString(),
      });
    }

    // 2. Ask AI what to do and let it execute
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let messages: any[] = [
      { role: "system", content: AUTOPILOT_SYSTEM },
      { role: "user", content: `Here is the current state of the CRM that needs attention:\n\n${workSummary}\n\nPlease handle all items that need action. Reply to unread messages and emails, confirm paid orders, and provide a summary of everything else.` },
    ];

    const actions: AutopilotAction[] = [];
    const MAX_ITERATIONS = 10;
    let iteration = 0;

    while (iteration++ < MAX_ITERATIONS) {
      // On the last iteration, force the AI to produce a text summary instead of more tool calls
      const isLastIteration = iteration === MAX_ITERATIONS;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 2048,
        messages,
        tools: AUTOPILOT_TOOLS,
        tool_choice: isLastIteration ? "none" : "auto",
      });

      const choice = response.choices[0];
      const message = choice.message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        messages.push(message as any);

        const toolResults = await Promise.all(
          message.tool_calls.map(async (tc) => {
            const fn = (tc as any).function;
            const args = JSON.parse(fn.arguments || "{}");
            const result = await executeAutopilotTool(fn.name, args, userId);

            // Log the action
            actions.push({
              type: fn.name,
              description: fn.name === "send_chat_message"
                ? `Replied to conversation ${args.conversationId?.slice(0, 8)}...`
                : fn.name === "update_record"
                ? `Updated ${args.table} record ${args.id?.slice(0, 8)}...`
                : fn.name === "create_record"
                ? `Created new ${args.table} record`
                : fn.name === "list_records"
                ? `Listed ${args.table} records`
                : fn.name === "get_record"
                ? `Fetched ${args.table} record ${args.id?.slice(0, 8)}...`
                : fn.name === "search_records"
                ? `Searched ${args.table} for "${args.query}"`
                : fn.name === "get_dashboard_stats"
                ? `Retrieved dashboard statistics`
                : fn.name === "get_messages"
                ? `Read messages from conversation ${args.conversationId?.slice(0, 8)}...`
                : fn.name === "send_email"
                ? `Sent email to ${(args.to || []).join(", ")}`
                : fn.name === "reply_email"
                ? `Replied to email ${args.emailId?.slice(0, 8)}...`
                : fn.name === "list_inbox_emails"
                ? `Listed ${args.unreadOnly ? "unread" : ""} emails in ${args.folder || "inbox"}`
                : fn.name === "get_email"
                ? `Read email ${args.emailId?.slice(0, 8)}...`
                : `Executed ${fn.name}`,
              details: { args, result },
              timestamp: new Date().toISOString(),
            });

            return {
              role: "tool" as const,
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            };
          }),
        );

        messages.push(...(toolResults as any[]));
        continue;
      }

      // Final text response — the summary
      return Response.json({
        actions,
        summary: message.content || "Autopilot cycle complete.",
        scannedAt: new Date().toISOString(),
        pendingCounts: {
          unreadMessages: work.unreadConversations.length,
          pendingOrders: work.pendingOrders.length,
          overdueTasks: work.overdueTasks.length,
          newLeads: work.newLeads.length,
          draftQuotes: work.draftQuotes.length,
          urgentDeals: work.urgentDeals.length,
          lowStock: work.lowStockProducts.length,
          unreadEmails: work.unreadEmails.length,
        },
      });
    }

    return Response.json({
      actions,
      summary: "Autopilot hit the maximum iteration limit.",
      scannedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Autopilot error:", err);
    return Response.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
