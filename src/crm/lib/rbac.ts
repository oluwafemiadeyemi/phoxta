import { supabaseClient } from "./supabase";

export type UserRole = "admin" | "manager" | "sales_rep" | "viewer";

export interface RolePermissions {
  [key: string]: boolean;
}

export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: RolePermissions;
  isActive: boolean;
}

/**
 * Get user role and permissions from database
 */
export async function getUserRoleAndPermissions(userId: string): Promise<{
  role: UserRole;
  permissions: RolePermissions;
} | null> {
  try {
    const { data, error } = await supabaseClient
      .from("team_members")
      .select("role, permissions")
      .eq("id", userId)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.error("[RBAC] Error fetching user role:", error);
      return null;
    }

    return {
      role: data.role,
      permissions: data.permissions || {},
    };
  } catch (error) {
    console.error("[RBAC] Exception fetching user role:", error);
    return null;
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(permissions: RolePermissions, permission: string): boolean {
  return permissions[permission] === true;
}

/**
 * Check multiple permissions (all must be true)
 */
export function hasAllPermissions(permissions: RolePermissions, requiredPermissions: string[]): boolean {
  return requiredPermissions.every((perm) => hasPermission(permissions, perm));
}

/**
 * Check multiple permissions (any can be true)
 */
export function hasAnyPermission(permissions: RolePermissions, requiredPermissions: string[]): boolean {
  return requiredPermissions.some((perm) => hasPermission(permissions, perm));
}

/**
 * Get role hierarchy level (for comparisons)
 */
export function getRoleLevel(role: UserRole): number {
  const hierarchy: Record<UserRole, number> = {
    admin: 4,
    manager: 3,
    sales_rep: 2,
    viewer: 1,
  };
  return hierarchy[role] || 0;
}

/**
 * Check if user can manage another user
 */
export function canManageUser(userRole: UserRole, targetUserRole: UserRole): boolean {
  const userLevel = getRoleLevel(userRole);
  const targetLevel = getRoleLevel(targetUserRole);
  return userLevel > targetLevel;
}

/**
 * Get readable role name
 */
export function getRoleName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    admin: "Administrator",
    manager: "Manager",
    sales_rep: "Sales Representative",
    viewer: "Viewer",
  };
  return names[role] || role;
}

/**
 * Check if user can view record (based on ownership and permissions)
 */
export function canViewRecord(
  userRole: UserRole,
  userId: string,
  recordUserId: string | null,
  permissions: RolePermissions
): boolean {
  // Admins can view all
  if (userRole === "admin") return true;

  // Can view own records
  if (userId === recordUserId) return true;

  // Can view team records if has permission
  if (hasPermission(permissions, "view_team_records")) return true;

  // Can view all records if has permission
  if (hasPermission(permissions, "view_all_records")) return true;

  return false;
}

/**
 * Check if user can edit record
 */
export function canEditRecord(
  userRole: UserRole,
  userId: string,
  recordUserId: string | null,
  permissions: RolePermissions
): boolean {
  // Admins can edit all
  if (userRole === "admin") return true;

  // Can edit own records if has permission
  if (userId === recordUserId && hasPermission(permissions, "edit_own_records")) return true;

  // Can edit team records if has permission
  if (hasPermission(permissions, "edit_team_records")) return true;

  // Can edit all records if has permission
  if (hasPermission(permissions, "edit_all_records")) return true;

  return false;
}

/**
 * Check if user can delete record
 */
export function canDeleteRecord(
  userRole: UserRole,
  userId: string,
  recordUserId: string | null,
  permissions: RolePermissions
): boolean {
  // Only admins and managers can delete
  if (userRole === "admin" || userRole === "manager") {
    return hasPermission(permissions, "delete_records");
  }

  return false;
}

/**
 * Get accessible resources based on role
 */
export function getAccessibleResources(role: UserRole): string[] {
  const resourceAccess: Record<UserRole, string[]> = {
    admin: [
      "contacts",
      "companies",
      "deals",
      "projects",
      "tasks",
      "quotes",
      "users",
      "team",
      "settings",
    ],
    manager: [
      "contacts",
      "companies",
      "deals",
      "projects",
      "tasks",
      "quotes",
      "team",
    ],
    sales_rep: ["contacts", "companies", "deals", "quotes"],
    viewer: ["contacts", "companies", "deals"],
  };

  return resourceAccess[role] || [];
}

/**
 * Audit logging helper
 */
export async function logUserAction(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: Record<string, any>
) {
  try {
    await supabaseClient.from("user_activity_logs").insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      status: "success",
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[RBAC] Error logging user action:", error);
  }
}

/**
 * Get user's accessible contacts (based on visibility settings)
 */
export async function getAccessibleContacts(
  userId: string,
  userRole: UserRole,
  permissions: RolePermissions
) {
  let query = supabaseClient.from("contacts").select("*");

  // Apply visibility filters based on role and permissions
  if (userRole === "viewer") {
    // Viewers can only see assigned contacts
    query = query.eq("user_id", userId);
  } else if (userRole === "sales_rep") {
    // Sales reps see their own and shared contacts
    if (!hasPermission(permissions, "view_all_records")) {
      query = query.or(`user_id.eq.${userId},shared_with.contains.[${userId}]`);
    }
  }
  // Managers and admins see all contacts in their scope

  return query;
}

/**
 * Stub class for RoleBasedAccessControl (used by field-level-access.ts)
 */
export class RoleBasedAccessControl {
  async getUserRole(userId: string): Promise<{ id: string; role: UserRole } | null> {
    const { data } = await supabaseClient
      .from("team_members")
      .select("id, role")
      .eq("id", userId)
      .single();
    if (!data) return null;
    return { id: data.id, role: (data.role as UserRole) || "viewer" };
  }
}
