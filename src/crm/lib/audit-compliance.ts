import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Audit Logging & Compliance System
 * Track all user activities, data changes, and compliance requirements
 */

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  status: "success" | "failure";
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ComplianceReport {
  id: string;
  user_id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  total_actions: number;
  data_access_count: number;
  data_modification_count: number;
  data_deletion_count: number;
  users_involved: number;
  generated_at: string;
}

export interface DataAccessLog {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: "view" | "download" | "export" | "print";
  accessed_fields: string[];
  access_reason?: string;
  accessed_at: string;
}

export interface SecurityEvent {
  id: string;
  user_id: string;
  event_type: string; // login_success, login_failure, permission_change, api_key_created, etc
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * Audit Logger
 * Log all user activities and changes
 */
export class AuditLogger {
  static async logAction(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    newValues?: Record<string, unknown>,
    oldValues?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog> {
    // Get client IP and user agent from browser
    const ipAddress = await this.getClientIp();
    const userAgent = navigator.userAgent;

    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
      user_agent: userAgent,
      status: "success",
      metadata,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient
      .from("audit_logs")
      .insert([auditLog]);

    if (error) throw error;
    return auditLog;
  }

  static async logFailure(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    errorMessage: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog> {
    const ipAddress = await this.getClientIp();
    const userAgent = navigator.userAgent;

    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      ip_address: ipAddress,
      user_agent: userAgent,
      status: "failure",
      error_message: errorMessage,
      metadata,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient
      .from("audit_logs")
      .insert([auditLog]);

    if (error) throw error;
    return auditLog;
  }

  static async getAuditLogs(
    userId: string,
    days: number = 90,
    limit: number = 100
  ): Promise<AuditLog[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabaseClient
      .from("audit_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getEntityAuditTrail(
    entityId: string,
    entityType: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    const { data, error } = await supabaseClient
      .from("audit_logs")
      .select("*")
      .eq("entity_id", entityId)
      .eq("entity_type", entityType)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getActionHistory(
    userId: string,
    action: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    const { data, error } = await supabaseClient
      .from("audit_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("action", action)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  private static async getClientIp(): Promise<string | undefined> {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json() as { ip: string };
      return data.ip;
    } catch {
      return undefined;
    }
  }

  static async deleteOldLogs(retentionDays: number = 365): Promise<void> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const { error } = await supabaseClient
      .from("audit_logs")
      .delete()
      .lt("created_at", cutoffDate.toISOString());

    if (error) throw error;
  }
}

/**
 * Data Access Logger
 * Log all data access for compliance
 */
export class DataAccessLogger {
  static async logDataAccess(
    userId: string,
    entityType: string,
    entityId: string,
    action: "view" | "download" | "export" | "print",
    accessedFields: string[] = [],
    reason?: string
  ): Promise<DataAccessLog> {
    const log: DataAccessLog = {
      id: crypto.randomUUID(),
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      accessed_fields: accessedFields,
      access_reason: reason,
      accessed_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient
      .from("data_access_logs")
      .insert([log]);

    if (error) throw error;
    return log;
  }

  static async getDataAccessHistory(
    entityId: string,
    entityType: string,
    limit: number = 100
  ): Promise<DataAccessLog[]> {
    const { data, error } = await supabaseClient
      .from("data_access_logs")
      .select("*")
      .eq("entity_id", entityId)
      .eq("entity_type", entityType)
      .order("accessed_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getUserDataAccessLog(
    userId: string,
    days: number = 30
  ): Promise<DataAccessLog[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabaseClient
      .from("data_access_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("accessed_at", startDate.toISOString())
      .order("accessed_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

/**
 * Security Event Logger
 * Log security-relevant events
 */
export class SecurityEventLogger {
  static async logSecurityEvent(
    userId: string,
    eventType: string,
    severity: "low" | "medium" | "high" | "critical",
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<SecurityEvent> {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      user_id: userId,
      event_type: eventType,
      severity,
      description,
      metadata,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient
      .from("security_events")
      .insert([event]);

    if (error) throw error;
    return event;
  }

  static async getSecurityEvents(
    userId?: string,
    severity?: string,
    days: number = 90
  ): Promise<SecurityEvent[]> {
    let query = supabaseClient
      .from("security_events")
      .select("*");

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (severity) {
      query = query.eq("severity", severity);
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await query
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getCriticalEvents(days: number = 30): Promise<SecurityEvent[]> {
    return this.getSecurityEvents(undefined, "critical", days);
  }
}

/**
 * Compliance Report Generator
 * Generate compliance reports
 */
export class ComplianceReportGenerator {
  static async generateComplianceReport(
    userId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<ComplianceReport> {
    const { data, error } = await supabaseClient.rpc(
      "generate_compliance_report",
      {
        p_user_id: userId,
        p_start_date: periodStart,
        p_end_date: periodEnd,
      }
    );

    if (error) throw error;

    const report: ComplianceReport = {
      id: crypto.randomUUID(),
      user_id: userId,
      report_type: "compliance",
      period_start: periodStart,
      period_end: periodEnd,
      total_actions: data?.total_actions || 0,
      data_access_count: data?.access_count || 0,
      data_modification_count: data?.modification_count || 0,
      data_deletion_count: data?.deletion_count || 0,
      users_involved: data?.users_count || 0,
      generated_at: new Date().toISOString(),
    };

    return report;
  }

  static async exportComplianceReport(
    report: ComplianceReport,
    format: "pdf" | "csv" | "json" = "pdf"
  ): Promise<Blob> {
    let content = "";

    if (format === "json") {
      content = JSON.stringify(report, null, 2);
      return new Blob([content], { type: "application/json" });
    }

    if (format === "csv") {
      content = `Compliance Report\n`;
      content += `Generated: ${report.generated_at}\n`;
      content += `Period: ${report.period_start} to ${report.period_end}\n\n`;
      content += `Total Actions,Data Access,Modifications,Deletions,Users\n`;
      content += `${report.total_actions},${report.data_access_count},${report.data_modification_count},${report.data_deletion_count},${report.users_involved}\n`;
      return new Blob([content], { type: "text/csv" });
    }

    // PDF format (placeholder)
    content = `Compliance Report\nGenerated: ${report.generated_at}`;
    return new Blob([content], { type: "application/pdf" });
  }
}

/**
 * GDPR Compliance Helper
 */
export class GDPRCompliance {
  static async getPersonalData(userId: string): Promise<Record<string, unknown>> {
    const { data, error } = await supabaseClient.rpc("get_user_personal_data", {
      p_user_id: userId,
    });

    if (error) throw error;
    return data || {};
  }

  static async requestDataExport(userId: string): Promise<string> {
    const exportId = crypto.randomUUID();

    const { error } = await supabaseClient
      .from("gdpr_data_exports")
      .insert([{
        id: exportId,
        user_id: userId,
        status: "pending",
        created_at: new Date().toISOString(),
      }]);

    if (error) throw error;
    return exportId;
  }

  static async requestDataDeletion(userId: string): Promise<string> {
    const deletionId = crypto.randomUUID();

    const { error } = await supabaseClient
      .from("gdpr_deletion_requests")
      .insert([{
        id: deletionId,
        user_id: userId,
        status: "pending",
        created_at: new Date().toISOString(),
      }]);

    if (error) throw error;
    return deletionId;
  }
}
