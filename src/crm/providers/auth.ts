import type { AuthProvider } from "@refinedev/core";
import { supabaseClient } from "@crm/lib/supabase";

/**
 * Pass-through auth provider for CRM embedded in Phoxta.
 * Phoxta's Next.js middleware already handles authentication,
 * so this provider simply delegates to the existing Supabase session.
 */
export const authProvider: AuthProvider = {
  login: async () => {
    // Login is handled by Phoxta's auth system
    return {
      success: true,
      redirectTo: "/app/crm",
    };
  },

  register: async () => {
    // Registration is handled by Phoxta's auth system
    return {
      success: true,
      redirectTo: "/app/crm",
    };
  },

  forgotPassword: async () => {
    return { success: true };
  },

  updatePassword: async () => {
    return { success: true };
  },

  check: async () => {
    try {
      const { data } = await supabaseClient.auth.getSession();
      const { session } = data;

      if (!session) {
        return {
          authenticated: false,
          error: {
            message: "Session not found",
            name: "Not authenticated",
          },
          logout: true,
          redirectTo: "/auth",
        };
      }

      return {
        authenticated: true,
      };
    } catch (error: any) {
      return {
        authenticated: false,
        error: {
          message: error?.message || "Check failed",
          name: "Session not found",
        },
        logout: true,
        redirectTo: "/auth",
      };
    }
  },

  logout: async () => {
    // Redirect to Phoxta's auth page instead of CRM login
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      return {
        success: false,
        error: {
          name: "Logout Error",
          message: error.message,
        },
      };
    }
    return {
      success: true,
      redirectTo: "/auth",
    };
  },

  onError: async (error) => {
    const msg = error instanceof Error ? error.message
      : (typeof error === "object" && error !== null && (error as any).message)
        ? `${(error as any).message} (code: ${(error as any).code ?? "?"})`
        : JSON.stringify(error);
    console.error("[Auth] onError:", msg);
    return { error };
  },

  getIdentity: async () => {
    const { data } = await supabaseClient.auth.getUser();

    if (data?.user) {
      try {
        const { data: member } = await supabaseClient
          .from("team_members")
          .select("id,name,email,avatar_url")
          .eq("id", data.user.id)
          .maybeSingle();

        if (member) {
          return {
            id: data.user.id,
            name: member.name || data.user.email || "User",
            email: member.email || data.user.email,
            avatar: member.avatar_url || data.user.user_metadata?.avatar_url,
          };
        }
      } catch {
        // ignore
      }

      return {
        id: data.user.id,
        name: data.user.email || "User",
        email: data.user.email,
        avatar: data.user.user_metadata?.avatar_url,
      };
    }

    return null;
  },
};
