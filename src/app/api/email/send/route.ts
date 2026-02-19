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

    // Wrap body in a mobile-responsive HTML email template
    const responsiveHtml = wrapInResponsiveTemplate(htmlBody || "");

    // Send the email
    const info = await transporter.sendMail({
      from: fromName ? `"${fromName}" <${fromAddress}>` : fromAddress,
      to: Array.isArray(to) ? to.join(", ") : to,
      cc: cc && cc.length > 0 ? (Array.isArray(cc) ? cc.join(", ") : cc) : undefined,
      bcc: bcc && bcc.length > 0 ? (Array.isArray(bcc) ? bcc.join(", ") : bcc) : undefined,
      subject: subject || "(No subject)",
      html: responsiveHtml,
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

/** Wrap raw HTML body in a mobile-responsive email document */
function wrapInResponsiveTemplate(body: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <title></title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, html { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size:15px; line-height:1.6; color:#1f2937; background-color:#f9fafb; }
    img { max-width:100%; height:auto; border:0; display:block; }
    table { border-collapse:collapse; }
    a { color:#6366f1; }

    /* Mobile-responsive product cards */
    @media only screen and (max-width: 620px) {
      .email-container { width:100% !important; padding:12px !important; }
      .product-row td { display:block !important; width:100% !important; padding:6px 0 !important; }
      .product-row td .product-card { max-width:100% !important; }
      .product-grid { width:100% !important; }
      .product-img { height:280px !important; }
      h1, h2, h3,
      .email-container h1,
      .email-container h2,
      .email-container h3 { word-break:break-word; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;">
  <center>
    <div class="email-container" style="max-width:600px;margin:0 auto;padding:24px 16px;background-color:#ffffff;">
      ${body}
    </div>
  </center>
</body>
</html>`;
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
