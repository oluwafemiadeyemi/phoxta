import { supabaseClient } from "./supabase";
import { logUserAction } from "./rbac";

/**
 * Workflow automation engine for triggering actions based on events
 */

export type WorkflowTrigger = 
  | "deal_status_changed"
  | "task_completed"
  | "new_contact_added"
  | "contact_updated"
  | "quote_sent"
  | "payment_received"
  | "meeting_scheduled";

export type WorkflowAction =
  | "send_email"
  | "create_task"
  | "update_field"
  | "send_notification"
  | "create_quote"
  | "assign_to_user";

export interface WorkflowCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in_range";
  value: any;
}

export interface WorkflowActionConfig {
  type: WorkflowAction;
  config: Record<string, any>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  conditions?: WorkflowCondition[];
  actions: WorkflowActionConfig[];
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  trigger_data: Record<string, any>;
  status: "pending" | "executing" | "completed" | "failed";
  started_at: string;
  completed_at?: string;
  error?: string;
}

/**
 * Workflow manager
 */
export class WorkflowEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();

  async loadWorkflows(userId: string) {
    try {
      const { data, error } = await supabaseClient
        .from("workflows")
        .select("*")
        .eq("created_by", userId)
        .eq("enabled", true);

      if (error) throw error;

      data?.forEach((workflow) => {
        this.workflows.set(workflow.id, workflow);
      });

      console.log(`[Workflows] Loaded ${data?.length || 0} active workflows`);
    } catch (error) {
      console.error("[Workflows] Failed to load workflows:", error);
    }
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    userId: string,
    definition: Omit<WorkflowDefinition, "id" | "created_by" | "created_at" | "updated_at">
  ): Promise<WorkflowDefinition | null> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabaseClient
        .from("workflows")
        .insert({
          ...definition,
          created_by: userId,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      this.workflows.set(data.id, data);
      await logUserAction(userId, "workflow_created", "workflows", data.id);

      return data;
    } catch (error) {
      console.error("[Workflows] Failed to create workflow:", error);
      return null;
    }
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(
    workflowId: string,
    triggerData: Record<string, any>,
    userId: string
  ): Promise<WorkflowExecution | null> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      console.warn(`[Workflows] Workflow ${workflowId} not found`);
      return null;
    }

    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}`,
      workflow_id: workflowId,
      trigger_data: triggerData,
      status: "pending",
      started_at: new Date().toISOString(),
    };

    try {
      // Check conditions
      if (workflow.conditions && !this.checkConditions(workflow.conditions, triggerData)) {
        console.log(`[Workflows] Conditions not met for workflow ${workflowId}`);
        return null;
      }

      execution.status = "executing";

      // Execute actions
      for (const action of workflow.actions) {
        await this.executeAction(action, triggerData, userId);
      }

      execution.status = "completed";
      execution.completed_at = new Date().toISOString();

      await logUserAction(userId, "workflow_executed", "workflows", workflowId);
    } catch (error) {
      execution.status = "failed";
      execution.error = error instanceof Error ? error.message : "Unknown error";
      execution.completed_at = new Date().toISOString();

      console.error(`[Workflows] Workflow execution failed:`, error);
    }

    // Store execution log
    await this.logExecution(execution);

    return execution;
  }

  /**
   * Check workflow conditions
   */
  private checkConditions(conditions: WorkflowCondition[], data: Record<string, any>): boolean {
    return conditions.every((condition) => {
      const value = data[condition.field];

      switch (condition.operator) {
        case "equals":
          return value === condition.value;
        case "not_equals":
          return value !== condition.value;
        case "contains":
          return String(value).includes(String(condition.value));
        case "greater_than":
          return Number(value) > Number(condition.value);
        case "less_than":
          return Number(value) < Number(condition.value);
        case "in_range":
          return (
            Number(value) >= condition.value.min &&
            Number(value) <= condition.value.max
          );
        default:
          return false;
      }
    });
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: WorkflowActionConfig,
    triggerData: Record<string, any>,
    userId: string
  ): Promise<void> {
    switch (action.type) {
      case "send_email":
        // Email functionality has been disabled
        console.log("[Workflow] Email action skipped - email feature disabled");
        break;

      case "create_task":
        await supabaseClient.from("tasks").insert({
          title: this.interpolateTemplate(action.config.title, triggerData),
          description: this.interpolateTemplate(action.config.description, triggerData),
          assigned_to: action.config.assigned_to || userId,
          status: "todo",
          priority: action.config.priority || "medium",
          due_date: action.config.due_date,
          created_by: userId,
        });
        break;

      case "update_field":
        const { table, id, field, value } = action.config;
        await supabaseClient
          .from(table)
          .update({ [field]: this.interpolateTemplate(value, triggerData) })
          .eq("id", id);
        break;

      case "send_notification":
        // Implement notification service
        console.log("[Workflows] Sending notification:", action.config);
        break;

      case "create_quote":
        // Implement quote creation logic
        console.log("[Workflows] Creating quote:", action.config);
        break;

      case "assign_to_user":
        const { assignTable, assignId, assignee } = action.config;
        await supabaseClient
          .from(assignTable)
          .update({ assigned_to: assignee })
          .eq("id", assignId);
        break;
    }
  }

  /**
   * Interpolate template with trigger data
   */
  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] ?? match;
    });
  }

  /**
   * Log workflow execution
   */
  private async logExecution(execution: WorkflowExecution): Promise<void> {
    try {
      await supabaseClient.from("workflow_executions").insert(execution);
    } catch (error) {
      console.error("[Workflows] Failed to log execution:", error);
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseClient
        .from("workflows")
        .update({ enabled: false })
        .eq("id", workflowId)
        .eq("created_by", userId);

      if (error) throw error;

      this.workflows.delete(workflowId);
      await logUserAction(userId, "workflow_deleted", "workflows", workflowId);

      return true;
    } catch (error) {
      console.error("[Workflows] Failed to delete workflow:", error);
      return false;
    }
  }

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(workflowId: string, limit: number = 50) {
    try {
      const { data, error } = await supabaseClient
        .from("workflow_executions")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("started_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("[Workflows] Failed to fetch execution history:", error);
      return [];
    }
  }

  /**
   * Test workflow without executing
   */
  testWorkflow(workflow: WorkflowDefinition, triggerData: Record<string, any>): {
    conditionsMet: boolean;
    actions: string[];
  } {
    const conditionsMet = workflow.conditions
      ? this.checkConditions(workflow.conditions, triggerData)
      : true;

    const actions = workflow.actions.map((action) => {
      return `${action.type}: ${JSON.stringify(action.config)}`;
    });

    return { conditionsMet, actions };
  }
}

/**
 * Common workflow templates
 */
export const WorkflowTemplates = {
  sendDealWinNotification: (userId: string): Omit<WorkflowDefinition, "id" | "created_by" | "created_at" | "updated_at"> => ({
    name: "Send notification when deal won",
    description: "Automatically send email when a deal is marked as won",
    trigger: "deal_status_changed",
    conditions: [{ field: "status", operator: "equals", value: "won" }],
    enabled: true,
    actions: [
      {
        type: "send_email",
        config: {
          to: "{{contact_email}}",
          subject: "Deal Won: {{deal_name}}",
          html: "<p>Great news! Your deal {{deal_name}} has been won. Total value: ${{deal_value}}</p>",
        },
      },
    ],
  }),

  createFollowUpTask: (userId: string): Omit<WorkflowDefinition, "id" | "created_by" | "created_at" | "updated_at"> => ({
    name: "Create follow-up task",
    description: "Create a follow-up task 3 days after a new contact is added",
    trigger: "new_contact_added",
    enabled: true,
    actions: [
      {
        type: "create_task",
        config: {
          title: "Follow up with {{contact_name}}",
          description: "Follow up with new contact {{contact_name}} to discuss opportunities",
          priority: "high",
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    ],
  }),

  
};

// Create global instance
export const workflowEngine = new WorkflowEngine();
