import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabaseServer";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  let parsedEmailId: string | undefined;
  let parsedUserId: string | undefined;

  try {
    // Support both cookie-based auth (browser) and service-role with userId (assistant/autopilot)
    const body = await req.json();
    const {
      emailId,
      accountId,
      to,
      cc,
      bcc,
      subject,
      body: htmlBody,
      fromAddress,
      fromName,
      userId: serviceUserId, // Optional: passed by assistant/autopilot tools
    } = body;

    parsedEmailId = emailId;

    let supabase: any;
    let userId: string;

    if (serviceUserId) {
      // Server-to-server call from assistant/autopilot — use service role
      supabase = createServiceRoleClient();
      userId = serviceUserId;
    } else {
      // Browser call — use cookie-based auth
      supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = user.id;
    }

    parsedUserId = userId;

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
      .eq("user_id", userId)
      .single();

    if (accErr || !account) {
      return NextResponse.json(
        { error: "Email account not found", details: "The sending account was not found. Check your email account settings." },
        { status: 404 },
      );
    }

    // Validate account has SMTP configured
    if (!account.smtp_host) {
      return NextResponse.json(
        { error: "SMTP not configured", details: "No SMTP host set for this account. Edit the account in Settings → Email Accounts and fill in the SMTP server details." },
        { status: 400 },
      );
    }
    if (!account.smtp_pass) {
      return NextResponse.json(
        { error: "SMTP password missing", details: "No SMTP password set for this account. Edit the account in Settings → Email Accounts and enter your email password (use an App Password for Gmail/Outlook)." },
        { status: 400 },
      );
    }

    // Build nodemailer transport from account settings
    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port || 587,
      secure: account.smtp_port === 465, // true for 465, false for other ports
      auth: {
        user: account.smtp_user || account.email_address,
        pass: account.smtp_pass,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certs
      },
    });

    // Send the email
    const info = await transporter.sendMail({
      from: fromName ? `"${fromName}" <${fromAddress}>` : fromAddress,
      to: Array.isArray(to) ? to.join(", ") : to,
      cc: cc && cc.length > 0 ? (Array.isArray(cc) ? cc.join(", ") : cc) : undefined,
      bcc: bcc && bcc.length > 0 ? (Array.isArray(bcc) ? bcc.join(", ") : bcc) : undefined,
      subject: subject || "(No subject)",
      html: htmlBody || "",
    });

    // Update the email record status to "sent"
    if (emailId) {
      const messageId = info.messageId || null;
      await supabase
        .from("emails")
        .update({
          status: "sent",
          message_id: messageId,
          error_message: "",
          sent_at: new Date().toISOString(),
        })
        .eq("id", emailId)
        .eq("user_id", userId);
    }

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
    });
  } catch (err: any) {
    console.error("[send-email] Error:", err);

    // Try to mark the email as failed
    try {
      if (parsedEmailId && parsedUserId) {
        const svc = createServiceRoleClient();
        await svc
          .from("emails")
          .update({
            status: "failed",
            error_message: err.message || "Unknown send error",
          })
          .eq("id", parsedEmailId)
          .eq("user_id", parsedUserId);
      }
    } catch {
      // Ignore error-reporting errors
    }

    return NextResponse.json(
      {
        error: "Failed to send email",
        details: formatSmtpError(err.message || String(err)),
      },
      { status: 500 },
    );
  }
}

function formatSmtpError(msg: string): string {
  if (msg.includes("EAUTH") || msg.includes("Invalid login") || msg.includes("authentication")) {
    return "SMTP authentication failed. Check your email and password (use an App Password for Gmail/Outlook).";
  }
  if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) {
    return "SMTP host not found. Check the SMTP host address in your account settings.";
  }
  if (msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED")) {
    return "Could not connect to SMTP server. Check the host, port, and TLS settings.";
  }
  if (msg.includes("ESOCKET") || msg.includes("SSL")) {
    return "TLS/SSL error connecting to SMTP server. Try changing the port (587 for STARTTLS, 465 for SSL).";
  }
  return msg;
}
