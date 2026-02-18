import { supabaseClient } from "./supabase";

/**
 * Bulk Import/Export System for v2.0.0
 * 
 * Provides:
 * - CSV import with validation
 * - Data export (CSV, JSON, Excel)
 * - Duplicate detection
 * - Import history and rollback
 * - Batch processing
 * - Field mapping
 */

export interface ImportJob {
  id: string;
  user_id: string;
  file_name: string;
  entity_type: "contact" | "deal" | "company" | "task";
  status: "pending" | "processing" | "completed" | "failed";
  total_records: number;
  imported_records: number;
  failed_records: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface FieldMapping {
  csvColumn: string;
  entityField: string;
  dataType?: "string" | "number" | "date" | "boolean";
  isRequired?: boolean;
  transform?: (value: any) => any;
}

export interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  jobId: string;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  value: any;
  reason: string;
}

/**
 * Bulk Import Manager
 */
export class BulkImportManager {
  /**
   * Parse CSV file
   */
  parseCSV(csvContent: string, delimiter: string = ","): any[][] {
    const lines = csvContent.split("\n").filter((line) => line.trim());
    return lines.map((line) => {
      // Simple CSV parser - use csv-parse library in production
      return line.split(delimiter).map((cell) => cell.trim());
    });
  }

  /**
   * Create import job
   */
  async createImportJob(
    userId: string,
    fileName: string,
    entityType: "contact" | "deal" | "company" | "task",
    totalRecords: number
  ): Promise<ImportJob> {
    const { data, error } = await supabaseClient
      .from("import_jobs")
      .insert({
        id: createBulkId(),
        user_id: userId,
        file_name: fileName,
        entity_type: entityType,
        status: "pending",
        total_records: totalRecords,
        imported_records: 0,
        failed_records: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Validate import data
   */
  validateData(
    records: any[],
    fieldMappings: FieldMapping[],
    entityType: string
  ): { valid: boolean; errors: ImportError[] } {
    const errors: ImportError[] = [];

    records.forEach((record, rowIndex) => {
      fieldMappings.forEach((mapping) => {
        const value = record[mapping.csvColumn];

        // Check required fields
        if (mapping.isRequired && !value) {
          errors.push({
            row: rowIndex + 1,
            field: mapping.entityField,
            value,
            reason: "Required field is empty",
          });
        }

        // Type validation
        if (value && mapping.dataType) {
          if (mapping.dataType === "number" && isNaN(Number(value))) {
            errors.push({
              row: rowIndex + 1,
              field: mapping.entityField,
              value,
              reason: "Invalid number format",
            });
          } else if (mapping.dataType === "date") {
            if (isNaN(new Date(value).getTime())) {
              errors.push({
                row: rowIndex + 1,
                field: mapping.entityField,
                value,
                reason: "Invalid date format (use YYYY-MM-DD)",
              });
            }
          } else if (mapping.dataType === "boolean") {
            if (!["true", "false", "yes", "no", "1", "0"].includes(String(value).toLowerCase())) {
              errors.push({
                row: rowIndex + 1,
                field: mapping.entityField,
                value,
                reason: "Invalid boolean value",
              });
            }
          }
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detect duplicates
   */
  async detectDuplicates(
    records: any[],
    entityType: string,
    uniqueFields: string[],
    fieldMappings: FieldMapping[]
  ): Promise<Map<number, boolean>> {
    const duplicates = new Map<number, boolean>();

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const query = supabaseClient.from(entityType).select("id");

      // Add filters for unique fields
      for (const field of uniqueFields) {
        const mapping = fieldMappings.find((item) => item.entityField === field);
        if (!mapping) continue;

        const value = record[mapping.csvColumn];
        if (value) {
          query.eq(field, value);
        }
      }

      const { data } = await query.limit(1);
      duplicates.set(i, (data?.length || 0) > 0);
    }

    return duplicates;
  }

  /**
   * Import records in batch
   */
  async importRecords(
    jobId: string,
    records: any[],
    entityType: string,
    fieldMappings: FieldMapping[],
    userId: string,
    skipDuplicates: boolean = false,
    baseFields: Record<string, any> = {}
  ): Promise<ImportResult> {
    const importResult: ImportResult = {
      success: 0,
      failed: 0,
      duplicates: 0,
      jobId,
      errors: [],
    };

    // Update job status
    await this.updateJobStatus(jobId, "processing");

    // Detect duplicates
    const uniqueFields = fieldMappings
      .filter((m) => m.isRequired)
      .map((m) => m.entityField);

    const duplicateMap = await this.detectDuplicates(records, entityType, uniqueFields, fieldMappings);

    // Process records in batches
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const mappedBatch = batch.map((record, idx) => {
        const mappedRecord: any = { ...baseFields };

        fieldMappings.forEach((mapping) => {
          let value = record[mapping.csvColumn];

          // Skip if duplicate
          if (skipDuplicates && duplicateMap.get(i + idx)) {
            importResult.duplicates++;
            return;
          }

          // Transform value
          if (value && mapping.transform) {
            value = mapping.transform(value);
          }

          // Type conversion
          if (value && mapping.dataType === "number") {
            value = Number(value);
          } else if (value && mapping.dataType === "boolean") {
            value = ["true", "yes", "1"].includes(String(value).toLowerCase());
          }

          mappedRecord[mapping.entityField] = value;
        });

        return mappedRecord;
      });

      // Insert batch
      const { error: insertError } = await supabaseClient
        .from(entityType)
        .insert(mappedBatch);

      if (insertError) {
        importResult.failed += mappedBatch.length;
        importResult.errors.push({
          row: i + 1,
          field: "batch",
          value: null,
          reason: insertError.message,
        });
      } else {
        importResult.success += mappedBatch.length;
      }

      // Update job progress
      await supabaseClient
        .from("import_jobs")
        .update({
          imported_records: importResult.success,
          failed_records: importResult.failed,
        })
        .eq("id", jobId);
    }

    // Complete job
    await this.updateJobStatus(
      jobId,
      importResult.failed === 0 ? "completed" : "failed",
      importResult.failed > 0 ? "Some records failed to import" : undefined
    );

    return importResult;
  }

  /**
   * Update import job status
   */
  private async updateJobStatus(jobId: string, status: string, errorMessage?: string) {
    const update: any = {
      status,
      completed_at: new Date().toISOString(),
    };

    if (errorMessage) {
      update.error_message = errorMessage;
    }

    await supabaseClient.from("import_jobs").update(update).eq("id", jobId);
  }

  /**
   * Rollback import
   */
  async rollbackImport(jobId: string) {
    const { data: job } = await supabaseClient
      .from("import_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (!job) throw new Error("Import job not found");

    // Delete records imported by this job
    await supabaseClient
      .from(job.entity_type)
      .delete()
      .eq("import_job_id", jobId);

    // Update job status
    await this.updateJobStatus(jobId, "failed", "Rollback completed");
  }

  /**
   * Get import history
   */
  async getImportHistory(userId: string, limit: number = 50): Promise<ImportJob[]> {
    const { data } = await supabaseClient
      .from("import_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    return data || [];
  }
}

/**
 * Bulk Export Manager
 */
export class BulkExportManager {
  /**
   * Export to CSV
   */
  async exportToCSV(
    entityType: string,
    filters?: Record<string, any>,
    columns?: string[]
  ): Promise<string> {
    let query = supabaseClient.from(entityType).select("*");

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }

    const { data } = await query;
    if (!data || data.length === 0) return "";

    // Select columns
    const exportData = columns
      ? data.map((row) =>
          columns.reduce((acc, col) => ({ ...acc, [col]: row[col] }), {})
        )
      : data;

    // Convert to CSV
    const headers = Object.keys(exportData[0] || {});
    const csvHeaders = headers.join(",");
    const csvRows = exportData
      .map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (value === null || value === undefined) return "";
            if (typeof value === "string" && value.includes(",")) {
              return `"${value}"`;
            }
            return value;
          })
          .join(",")
      )
      .join("\n");

    return `${csvHeaders}\n${csvRows}`;
  }

  /**
   * Export to JSON
   */
  async exportToJSON(
    entityType: string,
    filters?: Record<string, any>,
    columns?: string[]
  ): Promise<string> {
    let query = supabaseClient.from(entityType).select("*");

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }

    const { data } = await query;
    if (!data) return "[]";

    // Select columns
    const exportData = columns
      ? data.map((row) =>
          columns.reduce((acc, col) => ({ ...acc, [col]: row[col] }), {})
        )
      : data;

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export to Excel (requires xlsx library)
   */
  async exportToExcel(
    entityType: string,
    filters?: Record<string, any>,
    columns?: string[]
  ): Promise<Blob> {
    // This is a placeholder - implement with xlsx library in production
    // const XLSX = require("xlsx");
    const csvContent = await this.exportToCSV(entityType, filters, columns);
    return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  }

  /**
   * Schedule export
   */
  async scheduleExport(
    userId: string,
    entityType: string,
    format: "csv" | "json" | "xlsx",
    frequency?: "daily" | "weekly" | "monthly"
  ): Promise<{ id: string; nextRun: string }> {
    const scheduleId = createBulkId();
    const nextRun = new Date();

    if (frequency === "daily") {
      nextRun.setDate(nextRun.getDate() + 1);
    } else if (frequency === "weekly") {
      nextRun.setDate(nextRun.getDate() + 7);
    } else if (frequency === "monthly") {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }

    await supabaseClient.from("export_schedules").insert({
      id: scheduleId,
      user_id: userId,
      entity_type: entityType,
      format,
      frequency,
      next_run: nextRun.toISOString(),
      created_at: new Date().toISOString(),
    });

    return { id: scheduleId, nextRun: nextRun.toISOString() };
  }
}

// Export managers
export const bulkImportManager = new BulkImportManager();
export const bulkExportManager = new BulkExportManager();

function createBulkId() {
  return crypto.randomUUID();
}
