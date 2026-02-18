import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * API Key Management System
 * Handle API key generation, rotation, rate limiting, and usage tracking
 */

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string; // Store hash for security
  key_prefix: string; // First 8 chars for identification
  last_used_at?: string;
  expires_at?: string;
  is_active: boolean;
  permissions: string[];
  rate_limit: number; // requests per minute
  created_at: string;
  updated_at: string;
}

export interface ApiUsage {
  id: string;
  api_key_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  timestamp: string;
}

export interface RateLimitStatus {
  key_id: string;
  requests_current_minute: number;
  rate_limit: number;
  remaining: number;
  reset_at: string;
  is_limited: boolean;
}

export interface ApiKeyCreateResponse {
  id: string;
  name: string;
  key: string; // Full key only shown once
  key_prefix: string;
  permissions: string[];
  rate_limit: number;
}

/**
 * API Key Manager
 * Generate, rotate, and manage API keys
 */
export class ApiKeyManager {
  static async generateKeyHash(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  static generateRandomKey(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "sk_";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  static async createApiKey(
    userId: string,
    name: string,
    permissions: string[] = ["read:all"],
    rateLimit: number = 1000,
    expiresIn?: number // days
  ): Promise<ApiKeyCreateResponse> {
    const key = this.generateRandomKey();
    const keyHash = await this.generateKeyHash(key);
    const keyPrefix = key.substring(0, 8);
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const apiKey: Omit<ApiKey, "id"> = {
      user_id: userId,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      is_active: true,
      permissions,
      rate_limit: rateLimit,
      expires_at: expiresAt || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseClient
      .from("api_keys")
      .insert([apiKey])
      .select();

    if (error) throw error;
    if (!data || !data[0]) throw new Error("Failed to create API key");

    return {
      id: data[0].id,
      name: data[0].name,
      key, // Return full key only once
      key_prefix: keyPrefix,
      permissions,
      rate_limit: rateLimit,
    };
  }

  static async getApiKeys(userId: string): Promise<ApiKey[]> {
    const { data, error } = await supabaseClient
      .from("api_keys")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getApiKey(keyId: string): Promise<ApiKey | null> {
    const { data, error } = await supabaseClient
      .from("api_keys")
      .select("*")
      .eq("id", keyId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  }

  static async updateApiKey(
    keyId: string,
    updates: Partial<ApiKey>
  ): Promise<ApiKey> {
    const { data, error } = await supabaseClient
      .from("api_keys")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", keyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async rotateApiKey(
    userId: string,
    oldKeyId: string
  ): Promise<ApiKeyCreateResponse> {
    const oldKey = await this.getApiKey(oldKeyId);
    if (!oldKey || oldKey.user_id !== userId) {
      throw new Error("API key not found or unauthorized");
    }

    // Create new key with same permissions
    const newKey = await this.createApiKey(
      userId,
      `${oldKey.name} (rotated)`,
      oldKey.permissions,
      oldKey.rate_limit,
      oldKey.expires_at
        ? Math.ceil(
            (new Date(oldKey.expires_at).getTime() - Date.now()) /
              (24 * 60 * 60 * 1000)
          )
        : undefined
    );

    // Deactivate old key
    await this.updateApiKey(oldKeyId, { is_active: false });

    return newKey;
  }

  static async revokeApiKey(keyId: string): Promise<void> {
    const { error } = await supabaseClient
      .from("api_keys")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", keyId);

    if (error) throw error;
  }

  static async deleteApiKey(keyId: string): Promise<void> {
    const { error } = await supabaseClient
      .from("api_keys")
      .delete()
      .eq("id", keyId);

    if (error) throw error;
  }
}

/**
 * Rate Limiter
 * Check and enforce rate limits on API keys
 */
export class RateLimiter {
  static async checkRateLimit(keyId: string): Promise<RateLimitStatus> {
    const { data, error } = await supabaseClient.rpc("check_rate_limit", {
      p_key_id: keyId,
    });

    if (error) throw error;
    return data || { is_limited: true };
  }

  static async recordApiUsage(
    keyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number
  ): Promise<void> {
    const usage: Omit<ApiUsage, "id"> = {
      api_key_id: keyId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabaseClient
      .from("api_usage")
      .insert([usage]);

    if (error) throw error;
  }

  static async getUsageStats(
    keyId: string,
    days: number = 7
  ): Promise<Record<string, unknown>> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabaseClient.rpc("get_api_usage_stats", {
      p_key_id: keyId,
      p_start_date: startDate.toISOString(),
    });

    if (error) throw error;
    return data || {};
  }

  static async getCurrentMinuteUsage(keyId: string): Promise<number> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const { data, error } = await supabaseClient
      .from("api_usage")
      .select("id", { count: "exact" })
      .eq("api_key_id", keyId)
      .gte("timestamp", oneMinuteAgo.toISOString());

    if (error) throw error;
    return data?.length || 0;
  }
}

/**
 * API Permissions
 * Predefined permission sets
 */
export const API_PERMISSIONS = {
  READ_ALL: ["read:contacts", "read:companies", "read:deals", "read:tasks"],
  WRITE_CONTACTS: ["read:contacts", "write:contacts"],
  WRITE_DEALS: ["read:deals", "write:deals"],
  FULL_ACCESS: [
    "read:*",
    "write:*",
    "delete:contacts",
    "delete:deals",
    "admin:keys",
  ],
  LIMITED: ["read:contacts", "read:deals"],
};

export const DEFAULT_RATE_LIMITS = {
  FREE: 100,
  PRO: 1000,
  ENTERPRISE: 10000,
  UNLIMITED: 999999,
};
