import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { ImapFlow } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";

export const maxDuration = 30; // Allow up to 30s for IMAP fetch

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, userId: serviceUserId } = body;

    // Support two auth modes:
    // 1. Cookie-based (normal user request)
    // 2. Service-role (autopilot / internal calls pass userId)
    let userId: string;
    let supabase: any;

    if (serviceUserId) {
      // Service-role auth — trusted internal caller (autopilot)
      supabase = createServiceRoleClient();
      userId = serviceUserId;
    } else {
      // Cookie-based auth — normal user
      supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = user.id;
    }

    if (!accountId) {
      return NextResponse.json(
        { error: "No accountId provided" },
        { status: 400 },
      );
    }

    // Fetch the email account
    const { data: account, error: accErr } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (accErr || !account) {
      return NextResponse.json(
        { error: "Email account not found" },
        { status: 404 },
      );
    }

    // Determine IMAP settings
    const imapHost = account.imap_host || account.smtp_host;
    const imapPort = account.imap_port || 993;
    const imapSecure = account.imap_secure !== false;

    if (!imapHost) {
      return NextResponse.json(
        { error: "No IMAP host configured for this account. Edit the account in Settings and fill in the IMAP host." },
        { status: 400 },
      );
    }

    // Get existing external_ids to avoid duplicates
    const { data: existingEmails } = await supabase
      .from("emails")
      .select("external_id")
      .eq("user_id", userId)
      .eq("account_id", accountId)
      .not("external_id", "is", null);

    const existingExternalIds = new Set(
      (existingEmails || []).map((e: any) => e.external_id),
    );

    // Connect to IMAP
    const client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: imapSecure,
      auth: {
        user: account.smtp_user || account.email_address,
        pass: account.smtp_pass,
      },
      logger: false,
      tls: {
        rejectUnauthorized: false,
      },
    });

    await client.connect();

    let fetched = 0;
    const errors: string[] = [];

    try {
      // Open INBOX
      const mailbox = await client.mailboxOpen("INBOX");

      if (!mailbox.exists || mailbox.exists === 0) {
        await client.logout();
        return NextResponse.json({ fetched: 0, message: "Inbox is empty" });
      }

      // Fetch the latest 50 messages (or all if fewer)
      const totalMessages = mailbox.exists;
      const startSeq = Math.max(1, totalMessages - 49);
      const range = `${startSeq}:*`;

      for await (const msg of client.fetch(range, {
        envelope: true,
        source: true,
        uid: true,
        flags: true,
      })) {
        try {
          // Use UID as external_id for deduplication
          const externalId = `${accountId}:${msg.uid}`;

          if (existingExternalIds.has(externalId)) {
            continue; // Already synced
          }

          // Parse the email
          if (!msg.source) {
            errors.push(`No source for message UID ${msg.uid}`);
            continue;
          }
          let parsed: ParsedMail;
          try {
            parsed = await simpleParser(msg.source) as ParsedMail;
          } catch {
            errors.push(`Failed to parse message UID ${msg.uid}`);
            continue;
          }

          const fromAddr = parsed.from?.value?.[0]?.address || "";
          const fromName = parsed.from?.value?.[0]?.name || "";
          const toAddresses = (parsed.to
            ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to])
                .flatMap((t) => t.value.map((v) => v.address || ""))
                .filter(Boolean)
            : []);
          const ccAddresses = (parsed.cc
            ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc])
                .flatMap((t) => t.value.map((v) => v.address || ""))
                .filter(Boolean)
            : []);

          const htmlBody = parsed.html || parsed.textAsHtml || parsed.text || "";
          const plainText = parsed.text || "";
          const snippet = plainText.replace(/\s+/g, " ").trim().slice(0, 200);

          const messageId = parsed.messageId || null;
          const inReplyTo = parsed.inReplyTo || null;
          // Thread grouping: use In-Reply-To or References for thread_id
          const references = parsed.references;
          const threadId = inReplyTo
            || (references && references.length > 0 ? references[0] : null)
            || messageId;

          const isRead = msg.flags?.has("\\Seen") ?? false;
          const isStarred = msg.flags?.has("\\Flagged") ?? false;
          const hasAttachments = parsed.attachments && parsed.attachments.length > 0;

          const sentAt = parsed.date?.toISOString() || new Date().toISOString();

          const { error: insertErr } = await supabase.from("emails").insert({
            user_id: userId,
            account_id: accountId,
            external_id: externalId,
            message_id: messageId,
            in_reply_to: inReplyTo,
            thread_id: threadId,
            from_address: fromAddr,
            from_name: fromName,
            to_addresses: toAddresses,
            cc_addresses: ccAddresses,
            bcc_addresses: [],
            reply_to: parsed.replyTo?.value?.[0]?.address || fromAddr,
            subject: parsed.subject || "(No subject)",
            body: typeof htmlBody === "string" ? htmlBody : "",
            snippet,
            status: "received",
            category: "general",
            folder: "inbox",
            is_read: isRead,
            is_starred: isStarred,
            has_attachments: !!hasAttachments,
            labels: [],
            sent_at: sentAt,
          });

          if (insertErr) {
            errors.push(`Insert error for UID ${msg.uid}: ${insertErr.message}`);
          } else {
            fetched++;
          }
        } catch (msgErr: any) {
          errors.push(`Error processing UID ${msg.uid}: ${msgErr.message}`);
        }
      }
    } finally {
      await client.logout();
    }

    return NextResponse.json({
      fetched,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("[fetch-emails] Error:", err);

    // Provide helpful error messages for common IMAP issues
    let errorMessage = err.message || String(err);
    if (errorMessage.includes("AUTHENTICATIONFAILED") || errorMessage.includes("Invalid credentials")) {
      errorMessage = "IMAP authentication failed. Check your email address and password (use an App Password for Gmail).";
    } else if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
      errorMessage = "IMAP host not found. Check the IMAP host address in your account settings.";
    } else if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("ECONNREFUSED")) {
      errorMessage = "Could not connect to IMAP server. Check the host, port, and TLS settings.";
    }

    return NextResponse.json(
      {
        error: "Failed to fetch emails",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
