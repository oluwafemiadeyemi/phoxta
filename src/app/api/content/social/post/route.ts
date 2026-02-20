import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";

/**
 * POST /api/content/social/post
 * Cross-post content to multiple connected social media channels.
 *
 * In production this would call each platform's API to publish:
 *   - Facebook Graph API
 *   - Instagram Content Publishing API
 *   - Twitter/X API v2
 *   - LinkedIn Share API
 *   - TikTok Content Posting API
 *   - YouTube Data API
 *   - Pinterest Pins API
 *
 * For now it creates cross_post records and simulates publishing.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, channelIds } = body as {
      postId: string;
      channelIds: string[];
    };

    if (!postId || !channelIds?.length) {
      return NextResponse.json(
        { error: "postId and channelIds are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get the post content
    const { data: post, error: postError } = await supabase
      .from("content_posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Get the target channels
    const { data: channels, error: channelsError } = await supabase
      .from("content_channels")
      .select("*")
      .in("id", channelIds)
      .eq("auth_status", "connected");

    if (channelsError || !channels?.length) {
      return NextResponse.json(
        { error: "No connected channels found" },
        { status: 400 }
      );
    }

    const results: Array<{
      channelId: string;
      platform: string;
      status: string;
      crossPostId?: string;
      error?: string;
    }> = [];

    for (const channel of channels) {
      try {
        // Create cross-post record with "posting" status
        const { data: crossPost, error: insertError } = await supabase
          .from("content_cross_posts")
          .insert({
            post_id: postId,
            channel_id: channel.id,
            status: "posting",
          })
          .select("id")
          .single();

        if (insertError) {
          results.push({
            channelId: channel.id,
            platform: channel.platform,
            status: "failed",
            error: insertError.message,
          });
          continue;
        }

        // In production: call the platform's API to publish
        // For now, simulate a successful post
        // Each platform would have its own adapter:
        //
        // switch (channel.platform) {
        //   case "facebook":
        //     result = await facebookAdapter.publish(channel, post);
        //     break;
        //   case "instagram":
        //     result = await instagramAdapter.publish(channel, post);
        //     break;
        //   case "twitter":
        //     result = await twitterAdapter.publish(channel, post);
        //     break;
        //   ...
        // }

        // Simulate successful publishing
        const simulatedPlatformId = `${channel.platform}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const simulatedUrl = `https://${channel.platform}.com/post/${simulatedPlatformId}`;

        // Update the cross-post record with success
        await supabase
          .from("content_cross_posts")
          .update({
            status: "posted",
            platform_post_id: simulatedPlatformId,
            platform_url: simulatedUrl,
            posted_at: new Date().toISOString(),
          })
          .eq("id", crossPost!.id);

        results.push({
          channelId: channel.id,
          platform: channel.platform,
          status: "posted",
          crossPostId: crossPost!.id,
        });

        // Log the activity
        await supabase.from("content_activity_log").insert({
          user_id: post.user_id,
          action: `Cross-posted to ${channel.name} (${channel.platform})`,
          entity_type: "cross_post",
          entity_id: crossPost!.id,
          actor_name: "System",
          details: {
            post_title: post.title,
            channel: channel.name,
            platform: channel.platform,
            platform_url: simulatedUrl,
          },
        });
      } catch (err) {
        results.push({
          channelId: channel.id,
          platform: channel.platform,
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.status === "posted").length;
    const failCount = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      success: failCount === 0,
      published: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    console.error("Social post error:", error);
    return NextResponse.json(
      { error: "Failed to cross-post content" },
      { status: 500 }
    );
  }
}
