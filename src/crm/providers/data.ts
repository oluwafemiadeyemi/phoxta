import type { DataProvider } from "@refinedev/core";
import { supabaseClient } from "../lib/supabase";

// Map frontend resource names to database table names
const resourceToTable: Record<string, string> = {
  contacts: "contacts",
  companies: "companies",
  deals: "deals",
  tags: "tags",
  pipelineStages: "pipeline_stages",
  projects: "projects",
  tasks: "tasks",
  teamMembers: "team_members",
  projectStages: "project_stages",
  comments: "comments",
  attachments: "attachments",
  attachmentComments: "attachment_comments",
  quotes: "quotes",
  users: "team_members",
  companySettings: "company_settings",
  // E-commerce features
  orders: "orders",
  orderProducts: "order_products",
  products: "products",
  categories: "categories",
  stores: "stores",
  couriers: "couriers",
  customers: "customers",
  reviews: "reviews",
  staff: "staff",
  // Email feature
  emailAccounts: "email_accounts",
  emailTemplates: "email_templates",
  emails: "emails",
  // Finance feature
  financeTransactions: "finance_transactions",
  payrollRecords: "payroll_records",
  taxRecords: "tax_records",
  financialAccounts: "financial_accounts",
  budgets: "budgets",
  // Messaging feature
  messagingConfig: "messaging_config",
  messagingConversations: "messaging_conversations",
  messagingMessages: "messaging_messages",
  messagingTemplates: "messaging_templates",
  messagingQuickReplies: "messaging_quick_replies",
  messagingAutomations: "messaging_automations",
  messagingAnalytics: "messaging_analytics",
  // Content Studio
  contentPosts: "content_posts",
  contentChannels: "content_channels",
  contentLabels: "content_labels",
  contentMedia: "content_media",
  contentIdeas: "content_ideas",
  contentComments: "content_comments",
  contentActivityLog: "content_activity_log",
  contentTasks: "content_tasks",
  contentSocialInbox: "content_social_inbox",
  contentSocialAutomations: "content_social_automations",
  contentCrossPosts: "content_cross_posts",
  // Website Builder
  websiteSites: "website_sites",
  websitePages: "website_pages",
  websiteBreakpoints: "website_breakpoints",
  websiteElements: "website_elements",
  websiteGlobalStyles: "website_global_styles",
  websiteAssets: "website_assets",
  websiteCollections: "website_collections",
  websiteCollectionFields: "website_collection_fields",
  websiteCollectionItems: "website_collection_items",
  websiteInteractions: "website_interactions",
};

const isUserScopedTable = (tableName: string) => {
  // Most app tables are scoped by user_id. These tables rely on RLS or join-based access instead.
  const nonUserScoped = ["team_members", "attachments", "content_cross_posts"];
  return !nonUserScoped.includes(tableName);
};

// Helper: extract readable error info from Supabase PostgrestError objects
// (they don't serialize well with console.error — `{}` is shown instead)
const formatError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;
    if (e.message) return `${e.message} (code: ${e.code ?? "?"}, details: ${e.details ?? "none"}, hint: ${e.hint ?? "none"})`;
    return JSON.stringify(error, null, 2);
  }
  return String(error);
};

// Helper to get current user ID
const getCurrentUserId = async (): Promise<string> => {
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser();
  if (error || !user) {
    throw new Error("User not authenticated");
  }
  return user.id;
};

// Helper to handle tag relationships for contacts and deals
const handleTagRelations = async (resource: string, recordId: string, tagIds: string[], userId: string) => {
  if (!tagIds || tagIds.length === 0) return;

  const junctionTable = resource === "contacts" ? "contact_tags" : "deal_tags";
  const foreignKey = resource === "contacts" ? "contact_id" : "deal_id";

  // Delete existing relations
  await supabaseClient.from(junctionTable).delete().eq(foreignKey, recordId);

  // Insert new relations
  if (tagIds.length > 0) {
    const relations = tagIds.map((tagId) => ({
      [foreignKey]: recordId,
      tag_id: tagId,
    }));
    await supabaseClient.from(junctionTable).insert(relations);
  }
};


// Helper to fetch tag IDs for a record
const fetchTagIds = async (resource: string, recordId: string): Promise<string[]> => {
  const junctionTable = resource === "contacts" ? "contact_tags" : "deal_tags";
  const foreignKey = resource === "contacts" ? "contact_id" : "deal_id";

  const { data, error } = await supabaseClient.from(junctionTable).select("tag_id").eq(foreignKey, recordId);

  if (error) return [];
  return data.map((item) => item.tag_id);
};


// Helper to handle quote line items
const handleQuoteLineItems = async (quoteId: string, lineItems: any[]) => {
  if (!lineItems) return;

  // Delete existing line items
  await supabaseClient.from("quote_line_items").delete().eq("quote_id", quoteId);

  // Insert new line items
  if (lineItems.length > 0) {
    const items = lineItems.map((item) => ({
      quote_id: quoteId,
      product_service: item.product,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    }));
    await supabaseClient.from("quote_line_items").insert(items);
  }
};

// Helper to fetch quote line items
const fetchQuoteLineItems = async (quoteId: string): Promise<any[]> => {
  const { data, error } = await supabaseClient.from("quote_line_items").select("*").eq("quote_id", quoteId);

  if (error) return [];
  return data.map((item) => ({
    id: item.id,
    product: item.product_service,
    description: item.description,
    quantity: item.quantity,
    price: item.price,
    total: item.total,
  }));
};

// Helper to apply filters to Supabase query
const applyFilters = (query: any, filters: any) => {
  // Normalise: Refine v5 may pass { initial: [...] } or an array
  const list = Array.isArray(filters)
    ? filters
    : Array.isArray(filters?.initial)
      ? filters.initial
      : [];
  if (list.length === 0) return query;

  list.forEach((filter: any) => {
    if (!filter.value && filter.operator !== "null" && filter.operator !== "nnull") return;

    const field = "field" in filter ? filter.field : null;
    if (!field) return;

    // Convert camelCase to snake_case for database fields
    const dbField = field.replace(/([A-Z])/g, "_$1").toLowerCase();

    switch (filter.operator) {
      case "eq":
        query = query.eq(dbField, filter.value);
        break;
      case "ne":
        query = query.neq(dbField, filter.value);
        break;
      case "lt":
        query = query.lt(dbField, filter.value);
        break;
      case "gt":
        query = query.gt(dbField, filter.value);
        break;
      case "lte":
        query = query.lte(dbField, filter.value);
        break;
      case "gte":
        query = query.gte(dbField, filter.value);
        break;
      case "in":
        query = query.in(dbField, filter.value);
        break;
      case "contains":
        query = query.ilike(dbField, `%${filter.value}%`);
        break;
      case "null":
        query = query.is(dbField, null);
        break;
      case "nnull":
        query = query.not(dbField, "is", null);
        break;
      default:
        break;
    }
  });

  return query;
};

// Helper to apply sorting to Supabase query
const applySorting = (resource: string, query: any, sorters: any) => {
  // Normalise: Refine v5 may pass { initial: [...] } or an array
  const list = Array.isArray(sorters)
    ? sorters
    : Array.isArray(sorters?.initial)
      ? sorters.initial
      : [];
  if (list.length === 0) return query;

  list.forEach((sorter: any) => {
    const field = sorter.field.replace(/([A-Z])/g, "_$1").toLowerCase();
    query = query.order(field, { ascending: sorter.order === "asc" });
  });

  return query;
};

// Helper to transform database record to frontend format
const transformFromDb = async (resource: string, record: any): Promise<any> => {
  if (!record) return null;

  const transformed: any = {
    id: record.id,
  };

  // Map snake_case to camelCase
  Object.keys(record).forEach((key) => {
    if (key === "id" || key === "user_id") return;
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    transformed[camelKey] = record[key];
  });

  // Team members: expose a UI-friendly status string
  if ((resource === "users" || resource === "teamMembers") && typeof record.is_active === "boolean") {
    transformed.status = record.is_active ? "Active" : "Inactive";
  }

  if ((resource === "users" || resource === "teamMembers") && record.avatar_url && !transformed.avatar) {
    transformed.avatar = record.avatar_url;
  }

  if (resource === "companySettings" && record.company_logo && !transformed.logo) {
    transformed.logo = record.company_logo;
  }

  // Fetch tag relations for contacts and deals
  if (resource === "contacts" || resource === "deals") {
    transformed.tagIds = await fetchTagIds(resource, record.id);
  }


  // Fetch line items for quotes
  if (resource === "quotes") {
    transformed.lineItems = await fetchQuoteLineItems(record.id);

    const lineSubtotal = Array.isArray(transformed.lineItems)
      ? transformed.lineItems.reduce((sum: number, item: any) => sum + (Number(item.total ?? 0) || 0), 0)
      : 0;

    const subtotal = Number(transformed.subtotal ?? 0) || lineSubtotal;
    if (!Number.isFinite(transformed.subtotal) || transformed.subtotal === 0) {
      transformed.subtotal = subtotal;
    }

    const taxRateFromField = Number(transformed.taxRate ?? 0) || 0;
    const taxFromLegacy = Number(transformed.tax ?? 0) || 0;
    const derivedTaxRate = subtotal > 0 ? (taxFromLegacy / subtotal) * 100 : 0;
    if (!Number.isFinite(taxRateFromField) || taxRateFromField === 0) {
      transformed.taxRate = Number.isFinite(derivedTaxRate) ? Number(derivedTaxRate.toFixed(2)) : 0;
    }

    const discount = Number(transformed.discount ?? 0) || 0;
    const taxAmount = (Number(transformed.subtotal ?? 0) || 0) * (Number(transformed.taxRate ?? 0) || 0) / 100;
    const legacyTotal = Number(transformed.total ?? 0) || 0;
    const computedGrandTotal = Math.max(0, (Number(transformed.subtotal ?? 0) || 0) + taxAmount - discount);
    if (!Number.isFinite(transformed.grandTotal) || transformed.grandTotal === 0) {
      transformed.grandTotal = legacyTotal > 0 ? legacyTotal : computedGrandTotal;
    }
  }

  // Handle tasks checklist (stored as JSONB)
  if (resource === "tasks" && record.checklist) {
    transformed.checklist = record.checklist;
  }

  return transformed;
};

// Helper to transform frontend data to database format
const transformToDb = (resource: string, data: any): any => {
  const transformed: any = {};

  const isTeamMemberResource = resource === "users" || resource === "teamMembers";

  Object.keys(data).forEach((key) => {
    // Skip special fields handled separately
    if (key === "id" || key === "tagIds" || key === "lineItems") return;

    // Team members use is_active (boolean) in DB; UI uses status ("Active"/"Inactive")
    if (isTeamMemberResource && key === "status") return;

    if (isTeamMemberResource && key === "avatar") {
      transformed.avatar_url = data[key];
      return;
    }

    if (resource === "companySettings" && key === "logo") {
      transformed.company_logo = data[key];
      return;
    }

    // Convert camelCase to snake_case
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    const value = data[key];
    if (value === "" && snakeKey.endsWith("_id")) {
      transformed[snakeKey] = null;
    } else {
      transformed[snakeKey] = value;
    }
  });

  if (isTeamMemberResource && "status" in data) {
    const statusValue = (data as any).status;
    if (typeof statusValue === "string") {
      transformed.is_active = statusValue.toLowerCase() === "active";
    } else if (typeof statusValue === "boolean") {
      transformed.is_active = statusValue;
    }
  }

  // Quotes: keep legacy columns (`tax`, `total`) in sync with the newer model.
  // The UI stores `taxRate` (percent) + `grandTotal` (amount), while older schemas used `tax` + `total`.
  if (resource === "quotes") {
    const subtotal = Number(transformed.subtotal ?? 0) || 0;
    const taxRate = Number(transformed.tax_rate ?? 0) || 0;
    const discount = Number(transformed.discount ?? 0) || 0;
    const grandTotal = Number(transformed.grand_total ?? 0) || 0;

    // Only compute when we have a meaningful subtotal.
    const taxAmount = (subtotal * taxRate) / 100;
    transformed.tax = Number.isFinite(taxAmount) ? taxAmount : 0;

    // If grand_total isn't provided, compute it; otherwise mirror it.
    const computedGrandTotal = Math.max(0, subtotal + transformed.tax - discount);
    transformed.total = Number.isFinite(grandTotal) && grandTotal > 0 ? grandTotal : computedGrandTotal;
    if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
      transformed.grand_total = transformed.total;
    }
  }

  return transformed;
};

export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters, sorters }) => {
    try {
      const userId = await getCurrentUserId();
      const tableName = resourceToTable[resource] || resource;

      let query = supabaseClient.from(tableName).select("*", { count: "exact" });

      // Filter by user_id for data isolation
      if (isUserScopedTable(tableName)) {
        query = query.eq("user_id", userId);
      }

      // Apply filters
      query = applyFilters(query, filters || []);

      // Apply sorting
      query = applySorting(resource, query, sorters || []);

      // Apply pagination
      if (pagination && pagination.mode !== "off") {
        const current = ("current" in pagination ? pagination.current : 1) ?? 1;
        const pageSize = ("pageSize" in pagination ? pagination.pageSize : 10) ?? 10;
        const start = (Number(current) - 1) * Number(pageSize);
        const end = start + Number(pageSize) - 1;
        query = query.range(start, end);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error(`[Supabase] Error fetching ${resource}:`, formatError(error));
        throw error;
      }

      // Transform records
      const transformedData = await Promise.all((data || []).map((record) => transformFromDb(resource, record)));

      return {
        data: transformedData,
        total: count || 0,
      };
    } catch (error: any) {
      if (error?.name === "AbortError" || error?.message?.includes("aborted")) {
        return { data: [], total: 0 };
      }
      console.error(`[Supabase] Error in getList for ${resource}:`, formatError(error));
      throw error;
    }
  },

  getOne: async ({ resource, id }) => {
    try {
      const userId = await getCurrentUserId();
      const tableName = resourceToTable[resource] || resource;

      const allowMissing = resource === "companySettings";

      const baseQuery =
        resource === "companySettings"
          ? supabaseClient.from(tableName).select("*").eq("user_id", userId).limit(1)
          : isUserScopedTable(tableName)
            ? supabaseClient.from(tableName).select("*").eq("id", id).eq("user_id", userId)
            : supabaseClient.from(tableName).select("*").eq("id", id);

      const { data, error } = allowMissing ? await baseQuery.maybeSingle() : await baseQuery.single();

      if (error) {
        console.error(`[Supabase] Error fetching ${resource} with id ${id}:`, formatError(error));
        throw error;
      }

      if (!data && allowMissing) {
        return {
          // Return a minimal placeholder so UI can render; first-time setup can upsert later.
          data: {
            id,
            companyName: "My Company",
            logo: null,
            currency: "GBP",
            taxRate: 10,
            timezone: "Europe/London",
            address: "",
            phone: "",
            email: "",
          } as any,
        };
      }

      const transformedData = await transformFromDb(resource, data);

      return {
        data: transformedData,
      };
    } catch (error: any) {
      // Ignore AbortError — happens when React unmounts before the fetch completes
      if (error?.name === "AbortError" || error?.message?.includes("aborted")) {
        return { data: { id } as any };
      }
      console.error(`[Supabase] Error in getOne for ${resource}:`, formatError(error));
      throw error;
    }
  },

  create: async ({ resource, variables }) => {
    try {
      const userId = await getCurrentUserId();
      const tableName = resourceToTable[resource] || resource;

      // Extract special fields
      const { tagIds, lineItems, ...restVariables } = variables as any;

      // Transform data to database format
      const dbData = transformToDb(resource, restVariables);

      // Add user_id for data isolation when the table supports it
      if (isUserScopedTable(tableName)) {
        dbData.user_id = userId;
      }

      // Insert the main record
      const { data, error } = await supabaseClient.from(tableName).insert(dbData).select().single();

      if (error) {
        console.error(`[Supabase] Error creating ${resource}:`, formatError(error));
        throw error;
      }

      // Handle tag relations
      if (tagIds && (resource === "contacts" || resource === "deals")) {
        await handleTagRelations(resource, data.id, tagIds, userId);
      }


      // Handle quote line items
      if (lineItems && resource === "quotes") {
        await handleQuoteLineItems(data.id, lineItems);
      }

      const transformedData = await transformFromDb(resource, data);

      return {
        data: transformedData,
      };
    } catch (error) {
      console.error(`[Supabase] Error in create for ${resource}:`, formatError(error));
      throw error;
    }
  },

  update: async ({ resource, id, variables }) => {
    try {
      const userId = await getCurrentUserId();
      const tableName = resourceToTable[resource] || resource;

      // Extract special fields
      const { tagIds, lineItems, ...restVariables } = variables as any;

      // Transform data to database format
      const dbData = transformToDb(resource, restVariables);

      let data: any;
      let error: any;

      if (resource === "companySettings") {
        const upsertData = { ...dbData, user_id: userId, id };
        const upsertResult = await supabaseClient
          .from(tableName)
          .upsert(upsertData, { onConflict: "user_id" })
          .select()
          .limit(1)
          .maybeSingle();
        data = upsertResult.data;
        error = upsertResult.error;
      } else {
        // Update the main record with user_id filtering
        let updateQuery = supabaseClient.from(tableName).update(dbData).eq("id", id);
        if (isUserScopedTable(tableName)) {
          updateQuery = updateQuery.eq("user_id", userId);
        }

        const updateResult = await updateQuery.select().single();
        data = updateResult.data;
        error = updateResult.error;
      }

      if (error) {
        console.error(`[Supabase] Error updating ${resource} with id ${id}:`, formatError(error));
        throw error;
      }

      // Handle tag relations
      if (tagIds !== undefined && (resource === "contacts" || resource === "deals")) {
        await handleTagRelations(resource, id as string, tagIds, userId);
      }


      // Handle quote line items
      if (lineItems !== undefined && resource === "quotes") {
        await handleQuoteLineItems(id as string, lineItems);
      }

      const transformedData = await transformFromDb(resource, data);

      return {
        data: transformedData,
      };
    } catch (error) {
      console.error(`[Supabase] Error in update for ${resource}:`, formatError(error));
      throw error;
    }
  },

  deleteOne: async ({ resource, id }) => {
    try {
      const userId = await getCurrentUserId();
      const tableName = resourceToTable[resource] || resource;

      let deleteQuery = supabaseClient.from(tableName).delete().eq("id", id);
      if (isUserScopedTable(tableName)) {
        deleteQuery = deleteQuery.eq("user_id", userId);
      }

      const { data, error } = await deleteQuery.select().single();

      if (error) {
        console.error(`[Supabase] Error deleting ${resource} with id ${id}:`, formatError(error));
        throw error;
      }

      const transformedData = await transformFromDb(resource, data);

      return {
        data: transformedData,
      };
    } catch (error) {
      console.error(`[Supabase] Error in deleteOne for ${resource}:`, formatError(error));
      throw error;
    }
  },

  getMany: async ({ resource, ids }) => {
    try {
      const userId = await getCurrentUserId();
      const tableName = resourceToTable[resource] || resource;

      let query = supabaseClient.from(tableName).select("*").in("id", ids);
      if (isUserScopedTable(tableName)) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[Supabase] Error fetching multiple ${resource}:`, formatError(error));
        throw error;
      }

      const transformedData = await Promise.all((data || []).map((record) => transformFromDb(resource, record)));

      return {
        data: transformedData,
      };
    } catch (error) {
      console.error(`[Supabase] Error in getMany for ${resource}:`, formatError(error));
      throw error;
    }
  },

  getApiUrl: () => "",

  custom: async () => ({
    data: {} as any,
  }),
};
