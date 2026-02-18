import { supabaseClient } from "./supabase";

export interface SearchOptions {
  query: string;
  resourceType: "contacts" | "companies" | "deals" | "quotes";
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  name: string;
  email?: string;
  type: string;
  relevanceScore: number;
  matchedFields: string[];
}

/**
 * Advanced full-text search across CRM resources
 */
export async function searchResources(options: SearchOptions): Promise<SearchResult[]> {
  const { query, resourceType, limit = 20, offset = 0, filters = {} } = options;

  try {
    let results: any[] = [];
    let searchFields: string[] = [];

    // Define searchable fields per resource type
    const fieldsByType = {
      contacts: ["name", "email", "phone"],
      companies: ["name", "website", "notes"],
      deals: ["title", "notes"],
      quotes: ["quote_number", "notes"],
    };

    searchFields = fieldsByType[resourceType] || [];

    // Build search query
    let q = supabaseClient.from(resourceType).select("*").eq("deleted_at", null);

    // Apply text search
    if (query && searchFields.length > 0) {
      const searchConditions = searchFields.map((field) => `${field}.ilike.%${query}%`);
      q = q.or(searchConditions.join(","));
    }

    // Apply additional filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined) {
        q = q.eq(key, value);
      }
    }

    // Execute query
    const { data, error } = await q.range(offset, offset + limit - 1);

    if (error) {
      console.error("[Search] Error searching:", error);
      return [];
    }

    // Transform results
    return (data || []).map((item: any) => {
      const matchedFields = searchFields.filter((field) =>
        item[field]?.toString().toLowerCase().includes(query.toLowerCase())
      );

      return {
        id: item.id,
        name: item.name || item.title || item.email || "Unknown",
        email: item.email,
        type: resourceType,
        relevanceScore: calculateRelevance(query, item, matchedFields),
        matchedFields,
      };
    });
  } catch (error) {
    console.error("[Search] Exception:", error);
    return [];
  }
}

/**
 * Search across all resources (global search)
 */
export async function globalSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
  const resourceTypes: SearchOptions["resourceType"][] = ["contacts", "companies", "deals", "quotes"];

  try {
    const allResults = await Promise.all(
      resourceTypes.map((resourceType) =>
        searchResources({
          query,
          resourceType,
          limit,
        })
      )
    );

    // Combine and sort by relevance
    return allResults
      .flat()
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  } catch (error) {
    console.error("[GlobalSearch] Exception:", error);
    return [];
  }
}

/**
 * Calculate relevance score for search results
 */
function calculateRelevance(query: string, item: any, matchedFields: string[]): number {
  let score = 0;

  // Exact match bonus
  if (item.name?.toLowerCase() === query.toLowerCase()) score += 10;

  // Starts with query
  if (item.name?.toLowerCase().startsWith(query.toLowerCase())) score += 5;

  // Field count bonus (more matched fields = higher relevance)
  score += matchedFields.length * 2;

  // Multiple word match
  const queryWords = query.toLowerCase().split(" ");
  queryWords.forEach((word) => {
    if (item.name?.toLowerCase().includes(word)) score += 1;
  });

  return score;
}

/**
 * Save search filter as a view
 */
export async function saveFilterAsView(
  userId: string,
  name: string,
  resourceType: string,
  filters: Record<string, any>,
  isDefault: boolean = false
): Promise<{ success: boolean; viewId?: string; error?: string }> {
  try {
    const { data, error } = await supabaseClient.from("saved_views").insert({
      user_id: userId,
      name,
      resource_type: resourceType,
      filters,
      is_default: isDefault,
      created_at: new Date().toISOString(),
    }).select("id");

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, viewId: (data as any)?.[0]?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get saved views for user
 */
export async function getSavedViews(userId: string, resourceType: string) {
  try {
    const { data, error } = await supabaseClient
      .from("saved_views")
      .select("*")
      .eq("user_id", userId)
      .eq("resource_type", resourceType)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Views] Error fetching saved views:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
}

/**
 * Delete saved view
 */
export async function deleteSavedView(viewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseClient.from("saved_views").delete().eq("id", viewId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Advanced filter builder
 */
export class FilterBuilder {
  private filters: Array<{
    field: string;
    operator: string;
    value: any;
  }> = [];

  addFilter(field: string, operator: string, value: any): FilterBuilder {
    this.filters.push({ field, operator, value });
    return this;
  }

  equals(field: string, value: any): FilterBuilder {
    return this.addFilter(field, "eq", value);
  }

  notEquals(field: string, value: any): FilterBuilder {
    return this.addFilter(field, "neq", value);
  }

  contains(field: string, value: string): FilterBuilder {
    return this.addFilter(field, "ilike", `%${value}%`);
  }

  startsWith(field: string, value: string): FilterBuilder {
    return this.addFilter(field, "ilike", `${value}%`);
  }

  endsWith(field: string, value: string): FilterBuilder {
    return this.addFilter(field, "ilike", `%${value}`);
  }

  greaterThan(field: string, value: any): FilterBuilder {
    return this.addFilter(field, "gt", value);
  }

  lessThan(field: string, value: any): FilterBuilder {
    return this.addFilter(field, "lt", value);
  }

  inRange(field: string, min: any, max: any): FilterBuilder {
    this.addFilter(field, "gte", min);
    return this.addFilter(field, "lte", max);
  }

  isEmpty(field: string): FilterBuilder {
    return this.addFilter(field, "is", null);
  }

  isNotEmpty(field: string): FilterBuilder {
    return this.addFilter(field, "not", "is.null");
  }

  getFilters(): Record<string, any> {
    const filterObj: Record<string, any> = {};
    this.filters.forEach(({ field, operator, value }) => {
      filterObj[`${field}__${operator}`] = value;
    });
    return filterObj;
  }

  clear(): FilterBuilder {
    this.filters = [];
    return this;
  }
}

/**
 * Export search results to CSV
 */
export async function exportSearchResultsToCSV(
  resourceType: string,
  filters: Record<string, any>,
  fileName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabaseClient.from(resourceType).select("*").match(filters);

    if (error || !data) {
      return { success: false, error: error?.message };
    }

    // Convert to CSV
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row: any) => headers.map((h) => JSON.stringify(row[h])).join(",")),
    ].join("\n");

    // Download
    const element = document.createElement("a");
    element.setAttribute("href", `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`);
    element.setAttribute("download", fileName || `${resourceType}_export.csv`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
