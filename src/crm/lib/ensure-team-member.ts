import type { User } from "@supabase/supabase-js";
import { supabaseClient } from "@crm/lib/supabase";

function nameFromUser(user: User) {
  const md = (user.user_metadata ?? {}) as Record<string, any>;
  const raw = String(md.full_name || md.name || md.display_name || "").trim();
  if (raw) return raw;

  const email = (user.email || "").trim();
  if (email.includes("@")) return email.split("@")[0] || "User";
  return email || "User";
}

function avatarFromUser(user: User) {
  const md = (user.user_metadata ?? {}) as Record<string, any>;
  const raw = String(md.avatar_url || md.picture || "").trim();
  return raw || null;
}

/**
 * Ensures the logged-in user has a `team_members` row so chat can show name/avatar.
 *
 * Best-effort: failures are logged but do not block auth.
 */
export async function ensureTeamMemberProfile(user: User) {
  if (!user?.id) return;

  // Avoid spamming requests if the DB schema/policies reject the upsert.
  const storage = typeof window !== "undefined" ? window.localStorage : undefined;
  const attemptKey = storage ? `ensureTeamMemberProfile:lastAttempt:${user.id}` : null;
  const lastAttempt = attemptKey ? Number(storage?.getItem(attemptKey) ?? 0) : 0;
  const now = Date.now();
  if (attemptKey && lastAttempt && now - lastAttempt < 60_000) return;
  if (attemptKey) storage?.setItem(attemptKey, String(now));

  const email = (user.email || "").trim();
  const name = nameFromUser(user);
  const avatar_url = avatarFromUser(user);

  try {
    const basePayload = {
      id: user.id,
      user_id: user.id,
      name,
      email: email || `${user.id}@user.local`,
      avatar_url,
    };

    // Prefer the newer schema (includes is_active), but fall back for older DBs.
    const { error } = await supabaseClient
      .from("team_members")
      .upsert({ ...basePayload, is_active: true }, { onConflict: "id" });

    if (error) {
      const message = String((error as any)?.message ?? "");
      const code = String((error as any)?.code ?? "");

      // Typical for PostgREST when a column doesn't exist / schema cache mismatch.
      const looksLikeSchemaMismatch =
        code === "PGRST204" ||
        message.toLowerCase().includes("could not find") ||
        message.toLowerCase().includes("schema cache") ||
        message.toLowerCase().includes("column") ||
        message.toLowerCase().includes("unknown field");

      if (looksLikeSchemaMismatch) {
        const { error: fallbackError } = await supabaseClient
          .from("team_members")
          .upsert(basePayload, { onConflict: "id" });
        if (fallbackError) {
          console.warn("[Auth] ensureTeamMemberProfile fallback failed:", fallbackError);
        }
      } else {
        console.warn("[Auth] ensureTeamMemberProfile failed:", error);
      }
    }
  } catch (e) {
    console.warn("[Auth] ensureTeamMemberProfile exception:", e);
  }
}
