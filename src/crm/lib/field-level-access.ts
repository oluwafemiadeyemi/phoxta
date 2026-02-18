import { supabaseClient } from "./supabase";
import { RoleBasedAccessControl } from "./rbac";
import { v4 as uuidv4 } from "uuid";

/**
 * Field-Level Access Control (FLAC) for v2.0.0
 * 
 * Extends RBAC with:
 * - Field-level visibility controls
 * - Field-level editing controls
 * - Data masking for sensitive fields
 * - Field encryption
 * - Audit logging for field access
 */

export type FieldAccessLevel = "full" | "read" | "masked" | "none";

export interface FieldPermission {
  id: string;
  role_id: string;
  entity_type: string;
  field_name: string;
  access_level: FieldAccessLevel;
  can_edit: boolean;
  mask_pattern?: string; // For data masking (e.g., "****-****-****-####")
  requires_mfa?: boolean; // Require MFA for access
  created_at: string;
}

export interface FieldAccessLog {
  id: string;
  user_id: string;
  field_name: string;
  entity_type: string;
  entity_id: string;
  action: "read" | "write";
  access_level: FieldAccessLevel;
  created_at: string;
}

export interface EncryptedField {
  id: string;
  entity_type: string;
  field_name: string;
  is_encrypted: boolean;
  encryption_key_version: number;
  pii_category?: "ssn" | "credit_card" | "phone" | "email" | "address" | "salary";
}

/**
 * Field-Level Access Control Manager
 */
export class FieldLevelAccessControl {
  private rbac = new RoleBasedAccessControl();

  /**
   * Grant field access to role
   */
  async grantFieldAccess(
    roleId: string,
    entityType: string,
    fieldName: string,
    accessLevel: FieldAccessLevel,
    canEdit: boolean = false,
    maskPattern?: string
  ): Promise<FieldPermission> {
    const { data, error } = await supabaseClient
      .from("field_permissions")
      .insert({
        id: uuidv4(),
        role_id: roleId,
        entity_type: entityType,
        field_name: fieldName,
        access_level: accessLevel,
        can_edit: canEdit,
        mask_pattern: maskPattern,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Check field access
   */
  async checkFieldAccess(
    userId: string,
    entityType: string,
    fieldName: string,
    action: "read" | "write" = "read"
  ): Promise<FieldAccessLevel> {
    // Get user role
    const userRole = await this.rbac.getUserRole(userId);
    if (!userRole) return "none";

    // Get field permission
    const { data: permission } = await supabaseClient
      .from("field_permissions")
      .select("*")
      .eq("role_id", userRole.id)
      .eq("entity_type", entityType)
      .eq("field_name", fieldName)
      .single();

    if (!permission) {
      // Default to no access if not explicitly granted
      return "none";
    }

    // Check if action is allowed
    if (action === "write" && !permission.can_edit) {
      return permission.access_level === "masked" ? "masked" : "read";
    }

    return permission.access_level;
  }

  /**
   * Apply field-level security to object
   */
  async applyFieldSecurity(
    userId: string,
    entityType: string,
    entity: Record<string, any>
  ): Promise<Record<string, any>> {
    const secured: Record<string, any> = { ...entity };

    // Get all field permissions for user's role
    const userRole = await this.rbac.getUserRole(userId);
    if (!userRole) return {};

    const { data: permissions } = await supabaseClient
      .from("field_permissions")
      .select("*")
      .eq("role_id", userRole.id)
      .eq("entity_type", entityType);

    if (!permissions) return secured;

    // Process each field
    for (const [fieldName, value] of Object.entries(secured)) {
      const permission = permissions.find((p) => p.field_name === fieldName);

      if (!permission || permission.access_level === "none") {
        delete secured[fieldName];
        continue;
      }

      if (permission.access_level === "masked" && permission.mask_pattern) {
        secured[fieldName] = this.maskValue(String(value), permission.mask_pattern);
      }

      // Log access
      await this.logFieldAccess(userId, fieldName, entityType, entity.id, "read", permission.access_level);
    }

    return secured;
  }

  /**
   * Mask sensitive data
   */
  private maskValue(value: string, pattern: string): string {
    // Pattern examples: "****-****-****-####" masks all but last 4 chars
    if (pattern === "email") {
      const [local, domain] = value.split("@");
      return `${local.substring(0, 2)}${"*".repeat(local.length - 2)}@${domain}`;
    }

    if (pattern === "phone") {
      return value.replace(/\d(?=\d{4})/g, "*"); // ***-***-1234
    }

    if (pattern === "ssn") {
      return value.replace(/\d/g, "*").substring(0, 5) + value.substring(5); // ***-**-1234
    }

    // Generic pattern matching
    let masked = value;
    let patternIndex = 0;

    for (let i = 0; i < masked.length && patternIndex < pattern.length; i++) {
      if (pattern[patternIndex] === "#") {
        patternIndex++;
      } else if (pattern[patternIndex] === "*") {
        masked = masked.substring(0, i) + "*" + masked.substring(i + 1);
        patternIndex++;
      }
    }

    return masked;
  }

  /**
   * Log field access
   */
  private async logFieldAccess(
    userId: string,
    fieldName: string,
    entityType: string,
    entityId: string,
    action: "read" | "write",
    accessLevel: FieldAccessLevel
  ) {
    await supabaseClient.from("field_access_logs").insert({
      id: uuidv4(),
      user_id: userId,
      field_name: fieldName,
      entity_type: entityType,
      entity_id: entityId,
      action,
      access_level: accessLevel,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Set encryption for field
   */
  async setFieldEncryption(
    entityType: string,
    fieldName: string,
    piiCategory?: string
  ): Promise<EncryptedField> {
    const { data, error } = await supabaseClient
      .from("encrypted_fields")
      .insert({
        id: uuidv4(),
        entity_type: entityType,
        field_name: fieldName,
        is_encrypted: true,
        encryption_key_version: 1,
        pii_category: piiCategory,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Encrypt field value
   */
  async encryptFieldValue(value: string, keyVersion: number = 1): Promise<string> {
    // In production, use a proper encryption library like TweetNaCl or libsodium
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return `encrypted_${keyVersion}_${hashHex}`;
  }

  /**
   * Decrypt field value
   */
  async decryptFieldValue(encryptedValue: string): Promise<string> {
    // In production, implement proper decryption
    // This is a placeholder
    if (encryptedValue.startsWith("encrypted_")) {
      return "[REDACTED]";
    }
    return encryptedValue;
  }

  /**
   * Get field access audit trail
   */
  async getFieldAccessAudit(
    entityType: string,
    fieldName: string,
    limit: number = 100
  ): Promise<FieldAccessLog[]> {
    const { data } = await supabaseClient
      .from("field_access_logs")
      .select("*")
      .eq("entity_type", entityType)
      .eq("field_name", fieldName)
      .order("created_at", { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Bulk grant field access
   */
  async grantBulkFieldAccess(
    roleId: string,
    entityType: string,
    fieldPermissions: Array<{
      fieldName: string;
      accessLevel: FieldAccessLevel;
      canEdit?: boolean;
    }>
  ) {
    const permissions = fieldPermissions.map((fp) => ({
      id: uuidv4(),
      role_id: roleId,
      entity_type: entityType,
      field_name: fp.fieldName,
      access_level: fp.accessLevel,
      can_edit: fp.canEdit || false,
      created_at: new Date().toISOString(),
    }));

    await supabaseClient.from("field_permissions").insert(permissions);
  }

  /**
   * Create field permission template
   */
  async createFieldTemplate(
    templateName: string,
    entityType: string,
    fieldPermissions: Array<{
      fieldName: string;
      accessLevel: FieldAccessLevel;
      canEdit?: boolean;
    }>
  ) {
    const { data, error } = await supabaseClient
      .from("field_templates")
      .insert({
        id: uuidv4(),
        name: templateName,
        entity_type: entityType,
        permissions: fieldPermissions,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Apply field template to role
   */
  async applyFieldTemplate(roleId: string, templateId: string) {
    // Get template
    const { data: template } = await supabaseClient
      .from("field_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (!template) throw new Error("Template not found");

    // Apply permissions
    const permissions = template.permissions.map((fp: any) => ({
      id: uuidv4(),
      role_id: roleId,
      entity_type: template.entity_type,
      field_name: fp.fieldName,
      access_level: fp.accessLevel,
      can_edit: fp.canEdit || false,
      created_at: new Date().toISOString(),
    }));

    await supabaseClient.from("field_permissions").insert(permissions);
  }

  /**
   * Get PII fields for entity type
   */
  async getPiiFields(entityType: string): Promise<EncryptedField[]> {
    const { data } = await supabaseClient
      .from("encrypted_fields")
      .select("*")
      .eq("entity_type", entityType)
      .is("pii_category", "not.null");

    return data || [];
  }
}

export const flac = new FieldLevelAccessControl();
