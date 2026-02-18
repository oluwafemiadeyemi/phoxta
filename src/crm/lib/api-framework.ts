import { supabaseClient } from "./supabase";
import { validateFormData } from "./error-handling";
import { RateLimiter } from "./error-handling";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

/**
 * REST API Framework for v2.0.0
 * 
 * Provides:
 * - API key management
 * - Rate limiting per API
 * - Webhook support
 * - OpenAPI documentation
 * - Request/response handling
 */

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  organization_id: string;
  permissions: string[];
  rate_limit: number;
  last_used_at?: string;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface ApiRequest {
  id: string;
  api_key_id: string;
  method: string;
  endpoint: string;
  status: number;
  response_time: number;
  created_at: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  api_key_id: string;
  is_active: boolean;
  retry_policy: "exponential" | "linear" | "none";
  created_at: string;
}

/**
 * API Key Manager
 */
export class ApiKeyManager {
  private rateLimiters = new Map<string, RateLimiter>();

  /**
   * Generate new API key
   */
  async generateApiKey(
    organizationId: string,
    name: string,
    rateLimit: number = 1000
  ): Promise<ApiKey> {
    const key = `sk_${organizationId.substring(0, 8)}_${uuidv4().replace(/-/g, "").substring(0, 32)}`;

    const { data, error } = await supabaseClient
      .from("api_keys")
      .insert({
        key: await this.hashApiKey(key),
        name,
        organization_id: organizationId,
        rate_limit: rateLimit,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      key, // Return the plain key only once
    };
  }

  /**
   * Validate API key
   */
  async validateApiKey(key: string): Promise<ApiKey | null> {
    const hashedKey = await this.hashApiKey(key);

    const { data, error } = await supabaseClient
      .from("api_keys")
      .select("*")
      .eq("key", hashedKey)
      .eq("is_active", true)
      .single();

    if (error || !data) return null;

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    return data;
  }

  /**
   * Check rate limit
   */
  checkRateLimit(keyId: string, rateLimit: number): boolean {
    if (!this.rateLimiters.has(keyId)) {
      this.rateLimiters.set(keyId, new RateLimiter(rateLimit, 60000));
    }

    const limiter = this.rateLimiters.get(keyId)!;
    return limiter.isAllowed();
  }

  /**
   * Log API request
   */
  async logRequest(
    keyId: string,
    method: string,
    endpoint: string,
    status: number,
    responseTime: number
  ) {
    await supabaseClient.from("api_requests").insert({
      api_key_id: keyId,
      method,
      endpoint,
      status,
      response_time: responseTime,
      created_at: new Date().toISOString(),
    });

    // Update last used
    await supabaseClient
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyId);
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(keyId: string) {
    await supabaseClient
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", keyId);

    this.rateLimiters.delete(keyId);
  }

  /**
   * Simple hash for API keys (use proper hashing in production)
   */
  private async hashApiKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

/**
 * Webhook Manager
 */
export class WebhookManager {
  /**
   * Register webhook
   */
  async registerWebhook(
    apiKeyId: string,
    url: string,
    events: string[],
    retryPolicy: "exponential" | "linear" | "none" = "exponential"
  ): Promise<Webhook> {
    const { data, error } = await supabaseClient
      .from("webhooks")
      .insert({
        api_key_id: apiKeyId,
        url,
        events,
        retry_policy: retryPolicy,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Trigger webhook event
   */
  async triggerEvent(
    event: string,
    data: any,
    organizationId: string
  ) {
    // Get all webhooks subscribed to this event
    const { data: webhooks } = await supabaseClient
      .from("webhooks")
      .select("*")
      .contains("events", [event])
      .eq("is_active", true);

    if (!webhooks) return;

    // Send to each webhook
    for (const webhook of webhooks) {
      await this.sendWebhook(webhook, {
        event,
        timestamp: new Date().toISOString(),
        data,
      });
    }
  }

  /**
   * Send webhook with retry logic
   */
  private async sendWebhook(webhook: Webhook, payload: any, attempt: number = 0) {
    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": payload.event,
          "X-Webhook-Signature": await this.signPayload(payload),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok && webhook.retry_policy !== "none") {
        if (attempt < 3) {
          const delay = webhook.retry_policy === "exponential"
            ? Math.pow(2, attempt) * 1000
            : (attempt + 1) * 1000;

          setTimeout(() => this.sendWebhook(webhook, payload, attempt + 1), delay);
        }
      }

      // Log webhook delivery
      await supabaseClient.from("webhook_deliveries").insert({
        webhook_id: webhook.id,
        status: response.status,
        response: await response.text(),
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Webhook delivery failed: ${webhook.url}`, error);

      // Log failure
      await supabaseClient.from("webhook_deliveries").insert({
        webhook_id: webhook.id,
        status: 0,
        response: error instanceof Error ? error.message : "Unknown error",
        created_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Sign webhook payload
   */
  private async signPayload(payload: any): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

/**
 * API Response Handler
 */
export class ApiResponse {
  static success(data: any, message: string = "Success", statusCode: number = 200) {
    return {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static error(message: string, statusCode: number = 400, error?: any) {
    return {
      success: false,
      statusCode,
      message,
      error: error ? JSON.stringify(error) : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  static paginated(data: any[], total: number, page: number, pageSize: number) {
    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * API Endpoint Handler
 */
export class ApiEndpointHandler {
  private apiKeyManager = new ApiKeyManager();
  private webhookManager = new WebhookManager();

  /**
   * Handle API request
   */
  async handleRequest(
    apiKey: string,
    method: string,
    endpoint: string,
    body?: any
  ): Promise<any> {
    const startTime = performance.now();

    try {
      // Validate API key
      const keyData = await this.apiKeyManager.validateApiKey(apiKey);
      if (!keyData) {
        return ApiResponse.error("Invalid or expired API key", 401);
      }

      // Check rate limit
      if (!this.apiKeyManager.checkRateLimit(keyData.id, keyData.rate_limit)) {
        return ApiResponse.error("Rate limit exceeded", 429);
      }

      // Route to appropriate handler
      let result: any;

      switch (endpoint) {
        case "/contacts":
          result = await this.handleContactsEndpoint(method, body);
          break;
        case "/deals":
          result = await this.handleDealsEndpoint(method, body);
          break;
        case "/companies":
          result = await this.handleCompaniesEndpoint(method, body);
          break;
        case "/tasks":
          result = await this.handleTasksEndpoint(method, body);
          break;
        case "/api-keys":
          result = await this.handleApiKeysEndpoint(method, body, keyData.id);
          break;
        case "/webhooks":
          result = await this.handleWebhooksEndpoint(method, body, keyData.id);
          break;
        default:
          return ApiResponse.error("Endpoint not found", 404);
      }

      // Log request
      const responseTime = performance.now() - startTime;
      await this.apiKeyManager.logRequest(
        keyData.id,
        method,
        endpoint,
        result.statusCode || 200,
        Math.round(responseTime)
      );

      return result;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      console.error(`API Error: ${endpoint}`, error);
      return ApiResponse.error("Internal server error", 500, error);
    }
  }

  private async handleContactsEndpoint(method: string, body?: any) {
    if (method === "GET") {
      const { data, error } = await supabaseClient
        .from("contacts")
        .select("*")
        .limit(100);

      return ApiResponse.success(data || []);
    } else if (method === "POST") {
      const validation = await validateFormData(z.object({}).passthrough() as any, body);
      if (!validation.valid) {
        return ApiResponse.error("Validation failed", 400, validation.errors);
      }

      const { data, error } = await supabaseClient
        .from("contacts")
        .insert(body)
        .select()
        .single();

      return ApiResponse.success(data, "Contact created", 201);
    }

    return ApiResponse.error("Method not allowed", 405);
  }

  private async handleDealsEndpoint(method: string, body?: any) {
    if (method === "GET") {
      const { data, error } = await supabaseClient
        .from("deals")
        .select("*")
        .limit(100);

      return ApiResponse.success(data || []);
    } else if (method === "POST") {
      const validation = await validateFormData(z.object({}).passthrough() as any, body);
      if (!validation.valid) {
        return ApiResponse.error("Validation failed", 400, validation.errors);
      }

      const { data, error } = await supabaseClient
        .from("deals")
        .insert(body)
        .select()
        .single();

      return ApiResponse.success(data, "Deal created", 201);
    }

    return ApiResponse.error("Method not allowed", 405);
  }

  private async handleCompaniesEndpoint(method: string, body?: any) {
    if (method === "GET") {
      const { data } = await supabaseClient
        .from("companies")
        .select("*")
        .limit(100);

      return ApiResponse.success(data || []);
    }

    return ApiResponse.error("Method not allowed", 405);
  }

  private async handleTasksEndpoint(method: string, body?: any) {
    if (method === "GET") {
      const { data } = await supabaseClient
        .from("tasks")
        .select("*")
        .limit(100);

      return ApiResponse.success(data || []);
    }

    return ApiResponse.error("Method not allowed", 405);
  }

  private async handleApiKeysEndpoint(method: string, body: any, userId: string) {
    if (method === "POST") {
      const key = await this.apiKeyManager.generateApiKey(
        userId,
        body.name,
        body.rateLimit
      );
      return ApiResponse.success(key, "API key created", 201);
    } else if (method === "DELETE") {
      await this.apiKeyManager.revokeApiKey(body.keyId);
      return ApiResponse.success({}, "API key revoked");
    }

    return ApiResponse.error("Method not allowed", 405);
  }

  private async handleWebhooksEndpoint(method: string, body: any, userId: string) {
    if (method === "POST") {
      const webhook = await this.webhookManager.registerWebhook(
        userId,
        body.url,
        body.events,
        body.retryPolicy
      );
      return ApiResponse.success(webhook, "Webhook registered", 201);
    }

    return ApiResponse.error("Method not allowed", 405);
  }
}

// Create global instance
export const apiEndpointHandler = new ApiEndpointHandler();
export const apiKeyManager = new ApiKeyManager();
export const webhookManager = new WebhookManager();
