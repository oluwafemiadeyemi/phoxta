import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import nodemailer from "nodemailer";

/**
 * POST /api/email/test
 * Tests SMTP and IMAP connectivity for an email account.
 * Body: { accountId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: "No accountId provided" },
        { status: 400 },
      );
    }

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

    const results: { smtp: { ok: boolean; message: string }; imap: { ok: boolean; message: string } } = {
      smtp: { ok: false, message: "Not tested" },
      imap: { ok: false, message: "Not tested" },
    };

    // --- Test SMTP ---
    if (account.smtp_host) {
      try {
        const transporter = nodemailer.createTransport({
          host: account.smtp_host,
          port: account.smtp_port || 587,
          secure: account.smtp_port === 465,
          auth: {
            user: account.smtp_user || account.email_address,
            pass: account.smtp_pass,
          },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
        });

        await transporter.verify();
        results.smtp = { ok: true, message: "SMTP connection successful" };
      } catch (err: any) {
        const msg = err.message || String(err);
        if (msg.includes("EAUTH") || msg.includes("Invalid login") || msg.includes("authentication")) {
          results.smtp = { ok: false, message: "Authentication failed. Check your email and password (use an App Password for Gmail)." };
        } else if (msg.includes("ENOTFOUND")) {
          results.smtp = { ok: false, message: `SMTP host "${account.smtp_host}" not found. Check the hostname.` };
        } else if (msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED")) {
          results.smtp = { ok: false, message: "Connection timed out or refused. Check host, port, and firewall." };
        } else {
          results.smtp = { ok: false, message: msg };
        }
      }
    } else {
      results.smtp = { ok: false, message: "No SMTP host configured" };
    }

    // --- Test IMAP ---
    const imapHost = account.imap_host || account.smtp_host;
    if (imapHost) {
      try {
        // Dynamic import to avoid bundling issues if ImapFlow is not installed
        const { ImapFlow } = await import("imapflow");
        const client = new ImapFlow({
          host: imapHost,
          port: account.imap_port || 993,
          secure: account.imap_secure !== false,
          auth: {
            user: account.smtp_user || account.email_address,
            pass: account.smtp_pass,
          },
          logger: false,
          tls: { rejectUnauthorized: false },
        });

        await client.connect();
        await client.logout();
        results.imap = { ok: true, message: "IMAP connection successful" };
      } catch (err: any) {
        const msg = err.message || String(err);
        if (msg.includes("AUTHENTICATIONFAILED") || msg.includes("Invalid credentials")) {
          results.imap = { ok: false, message: "Authentication failed. Check credentials (use an App Password for Gmail)." };
        } else if (msg.includes("ENOTFOUND")) {
          results.imap = { ok: false, message: `IMAP host "${imapHost}" not found. Check the hostname.` };
        } else if (msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED")) {
          results.imap = { ok: false, message: "Connection timed out or refused. Check host, port, and TLS." };
        } else {
          results.imap = { ok: false, message: msg };
        }
      }
    } else {
      results.imap = { ok: false, message: "No IMAP host configured" };
    }

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("[test-email] Error:", err);
    return NextResponse.json(
      { error: "Test failed", details: err.message || String(err) },
      { status: 500 },
    );
  }
}
