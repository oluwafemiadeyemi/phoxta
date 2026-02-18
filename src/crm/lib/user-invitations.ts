import { supabaseClient } from "./supabase";
import { v4 as uuidv4 } from "uuid";

export interface UserInvitation {
  id: string;
  email: string;
  role: "admin" | "manager" | "sales_rep" | "viewer";
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  invitedBy: string;
  createdAt: string;
}

/**
 * Invite user to CRM by email
 */
export async function inviteUser(
  email: string,
  role: "admin" | "manager" | "sales_rep" | "viewer",
  invitedByUserId?: string,
  teamId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Netlify function handles: auth-check, user lookup, invitation creation, and email delivery.
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const jwt = sessionData?.session?.access_token;
    if (!jwt) return { success: false, error: "Not authenticated" };

    const res = await fetch("/.netlify/functions/invite-user", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ email, role, invitedByUserId, teamId }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: json?.error || "Failed to send invitation" };
    return { success: true };
  } catch (error) {
    console.error("[Invitation] Exception:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Accept user invitation
 */
export async function acceptInvitation(
  token: string,
  name: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: any }> {
  try {
    const res = await fetch("/.netlify/functions/accept-invitation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password, fullName: name }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: json?.error || "Failed to accept invitation" };
    return { success: true };
  } catch (error) {
    console.error("[Invitation] Exception:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get pending invitations for user
 */
export async function getPendingInvitations(invitedByUserId: string): Promise<UserInvitation[]> {
  try {
    const { data, error } = await supabaseClient
      .from("user_invitations")
      .select("*")
      .eq("invited_by", invitedByUserId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Invitation] Error fetching pending invitations:", error);
      return [];
    }

    return data.map((inv: any) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      token: inv.token,
      expiresAt: inv.expires_at,
      acceptedAt: inv.accepted_at,
      invitedBy: inv.invited_by,
      createdAt: inv.created_at,
    }));
  } catch (error) {
    console.error("[Invitation] Exception:", error);
    return [];
  }
}

/**
 * Resend invitation email
 */
export async function resendInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: invitation, error } = await supabaseClient
      .from("user_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (error || !invitation) {
      return { success: false, error: "Invitation not found" };
    }

    if (invitation.accepted_at) {
      return { success: false, error: "Invitation already accepted" };
    }

    // Extend expiration date
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await supabaseClient
      .from("user_invitations")
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq("id", invitationId);

    // Email notifications disabled
    return { success: true };
  } catch (error) {
    console.error("[Invitation] Exception:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Cancel invitation
 */
export async function cancelInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseClient.from("user_invitations").delete().eq("id", invitationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("[Invitation] Exception:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Bulk invite users
 */
export async function bulkInviteUsers(
  emails: string[],
  role: "admin" | "manager" | "sales_rep" | "viewer",
  invitedByUserId: string
): Promise<{ success: number; failed: number; errors: Array<{ email: string; error: string }> }> {
  const errors: Array<{ email: string; error: string }> = [];
  let success = 0;
  let failed = 0;

  for (const email of emails) {
    const result = await inviteUser(email, role, invitedByUserId);
    if (result.success) {
      success++;
    } else {
      failed++;
      errors.push({ email, error: result.error || "Unknown error" });
    }
  }

  return { success, failed, errors };
}
