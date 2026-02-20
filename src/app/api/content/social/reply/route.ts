import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";
import { runPhoxtaAI } from "@/lib/aiClient";

/**
 * POST /api/content/social/reply
 * Reply to a social media inbox message.
 *
 * In production this would call the platform's API (Facebook Graph, Twitter API, etc.)
 * to post the reply. For now it updates the inbox record and creates an activity log.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, channelId, body: replyBody, platform, externalId, useAi, aiTone } = body as {
      messageId: string;
      channelId: string;
      body: string;
      platform: string;
      externalId?: string;
      useAi?: boolean;
      aiTone?: string;
    };

    if (!messageId || !replyBody) {
      return NextResponse.json({ error: "messageId and body are required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    let finalReply = replyBody;

    // If AI refinement is requested, enhance the reply
    if (useAi) {
      const aiResult = await runPhoxtaAI(
        `You are a social media manager. Refine the following reply to be ${aiTone || "professional"} and engaging. Keep it concise. Return JSON: { "reply": "..." }`,
        `Platform: ${platform}\nOriginal reply: ${replyBody}`,
        { temperature: 0.7, maxTokens: 500 }
      );
      const reply = aiResult?.reply;
      if (typeof reply === "string" && reply) {
        finalReply = reply;
      }
    }

    // Update the inbox message status to "replied"
    const { error: updateError } = await supabase
      .from("content_social_inbox")
      .update({
        status: "replied",
        replied_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // In production: call platform API to post the actual reply
    // e.g., for Facebook: POST https://graph.facebook.com/{comment_id}/replies
    // For now, log the activity

    // Get the channel info for the activity log
    const { data: channel } = await supabase
      .from("content_channels")
      .select("user_id, name, platform")
      .eq("id", channelId)
      .single();

    if (channel) {
      await supabase.from("content_activity_log").insert({
        user_id: channel.user_id,
        action: `Replied to ${platform} message`,
        entity_type: "social_inbox",
        entity_id: messageId,
        actor_name: "You",
        details: {
          reply: finalReply.slice(0, 200),
          channel: channel.name,
          platform: channel.platform,
        },
      });
    }

    return NextResponse.json({
      success: true,
      reply: finalReply,
      messageId,
    });
  } catch (error) {
    console.error("Social reply error:", error);
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }
}
