import { z } from "zod";

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(
    public errors: Record<string, string[]>,
    public message: string = "Validation failed"
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Global error handler
 */
export function handleError(error: unknown): {
  message: string;
  code: string;
  details?: any;
  statusCode?: number;
} {
  console.error("[Error] Caught error:", error);

  if (error instanceof ValidationError) {
    return {
      message: error.message,
      code: "VALIDATION_ERROR",
      details: error.errors,
    };
  }

  if (error instanceof ApiError) {
    return {
      message: error.message,
      code: "API_ERROR",
      statusCode: error.statusCode,
      details: error.details,
    };
  }

  if (error instanceof z.ZodError) {
    const errors: Record<string, string[]> = {};
    error.issues.forEach((err) => {
      const path = err.path.join(".");
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return {
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      details: errors,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: error.name || "UNKNOWN_ERROR",
      details: { stack: error.stack },
    };
  }

  return {
    message: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
    details: { raw: error },
  };
}

/**
 * Form validation schemas
 */
export const validationSchemas = {
  contact: z.object({
    name: z.string().min(1, "Name is required").max(255),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    companyId: z.string().uuid("Invalid company").optional(),
    status: z.enum(["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]),
    tagIds: z.array(z.string().uuid()).optional(),
  }),

  company: z.object({
    name: z.string().min(1, "Company name is required").max(255),
    industry: z
      .enum(["SaaS", "E-commerce", "Healthcare", "Finance", "Education", "Manufacturing", "Other"])
      .optional(),
    website: z.string().url().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  }),

  deal: z.object({
    title: z.string().min(1, "Deal title is required").max(255),
    contactId: z.string().uuid("Invalid contact"),
    companyId: z.string().uuid("Invalid company").optional(),
    value: z.number().min(0, "Value must be positive"),
    status: z.enum(["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]),
    tagIds: z.array(z.string().uuid()).optional(),
  }),

  task: z.object({
    title: z.string().min(1, "Task title is required").max(255),
    description: z.string().optional(),
    projectId: z.string().uuid("Invalid project"),
    stage: z.enum(["Unassigned", "Todo", "In Progress", "In Review", "Done"]),
    priority: z.enum(["Low", "Medium", "High", "Urgent"]),
    dueDate: z.string().datetime().optional(),
    assigneeId: z.string().uuid().optional(),
  }),

  quote: z.object({
    contactId: z.string().uuid("Invalid contact"),
    companyId: z.string().uuid("Invalid company"),
    quoteDate: z.string().datetime(),
    expiryDate: z.string().datetime(),
    lineItems: z
      .array(
        z.object({
          product: z.string(),
          description: z.string(),
          quantity: z.number().min(1),
          price: z.number().min(0),
          total: z.number().min(0),
        })
      )
      .min(1, "At least one line item is required"),
    taxRate: z.number().min(0).max(100).optional(),
    discount: z.number().min(0).optional(),
    notes: z.string().optional(),
  }),

  user: z.object({
    email: z.string().email("Invalid email"),
    name: z.string().min(1, "Name is required").max(255),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["admin", "manager", "sales_rep", "viewer"]),
  }),

  invite: z.object({
    email: z.string().email("Invalid email"),
    role: z.enum(["admin", "manager", "sales_rep", "viewer"]),
  }),
};

/**
 * Validate form data
 */
export async function validateFormData(
  schema: z.ZodSchema,
  data: unknown
): Promise<{ valid: boolean; errors?: Record<string, string[]>; data?: unknown }> {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (!errors[path]) errors[path] = [];
        errors[path].push(err.message);
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: { _error: ["Validation failed"] } };
  }
}

/**
 * Retry utility for API calls
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = delayMs * Math.pow(2, attempt - 1); // Exponential backoff
      console.warn(`[Retry] Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private calls: number[] = [];

  constructor(private maxCalls: number, private windowMs: number) {}

  isAllowed(): boolean {
    const now = Date.now();
    this.calls = this.calls.filter((time) => now - time < this.windowMs);

    if (this.calls.length < this.maxCalls) {
      this.calls.push(now);
      return true;
    }

    return false;
  }

  getResetTime(): number {
    if (this.calls.length === 0) return 0;
    return this.calls[0] + this.windowMs - Date.now();
  }
}

/**
 * Async debounce
 */
export function debounce<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => Promise<any> {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    return new Promise((resolve, reject) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delayMs);
    });
  };
}

/**
 * Input sanitization
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript protocol
    .substring(0, 1000); // Limit length
}

/**
 * Check field errors
 */
export function getFieldError(errors: Record<string, string[]>, fieldName: string): string | null {
  return errors[fieldName]?.[0] || null;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: Record<string, string[]>): string {
  return Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
    .join("\n");
}
