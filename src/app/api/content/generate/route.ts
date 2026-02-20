import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";
import { runPhoxtaAI } from "@/lib/aiClient";

const SYSTEM_PROMPT = `You are a world-class content writer and social media strategist.
Generate content based on the user's request. Return JSON with these fields:
- "text": the generated content text
- "title": a suggested title (if applicable)
- "excerpt": a brief 1-2 sentence summary
- "seoDescription": a concise meta description for SEO (max 160 chars)
- "tags": an array of 3-5 relevant hashtag-style tags (no # prefix)

Adapt tone, length, and style to the content type provided.
Keep the output professional, engaging, and platform-appropriate.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, type, field, existingContent } = body as {
      prompt: string;
      type?: string;
      field?: string;
      existingContent?: string;
    };

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    let userPrompt = prompt;
    if (type) userPrompt += `\n\nContent type: ${type}`;
    if (field) userPrompt += `\nGenerate content specifically for the "${field}" field.`;
    if (existingContent) userPrompt += `\n\nExisting content for context:\n${existingContent.slice(0, 2000)}`;

    const result = await runPhoxtaAI(SYSTEM_PROMPT, userPrompt, {
      temperature: 0.8,
      maxTokens: 2000,
    });

    // If no specific field requested, create a draft post in the database
    if (!field || field === "body") {
      const supabase = createServiceRoleClient();

      // Get the user from the authorization header / cookie if available
      const authHeader = request.headers.get("authorization");
      let userId: string | null = null;

      if (authHeader?.startsWith("Bearer ")) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        userId = user?.id ?? null;
      }

      // If we can identify the user, save the draft
      if (userId) {
        const { data: post } = await supabase.from("content_posts").insert({
          user_id: userId,
          title: (result.title as string) || "AI Generated Draft",
          body: (result.text as string) || "",
          excerpt: (result.excerpt as string) || "",
          seo_description: (result.seoDescription as string) || "",
          tags: (result.tags as string[]) || [],
          content_type: type || "social_post",
          status: "draft",
          ai_generated: true,
          ai_prompt: prompt,
        }).select("id").single();

        return NextResponse.json({
          ...result,
          id: post?.id,
          saved: true,
        });
      }
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[content/generate] Error:", error);
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
