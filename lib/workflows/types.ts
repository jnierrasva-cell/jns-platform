/**
 * Workflow engine — shared types
 */

export type WorkflowStatus = "draft" | "active" | "paused" | "archived";
export type RunStatus = "running" | "waiting" | "completed" | "failed" | "cancelled";
export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type JobStatus = "pending" | "locked" | "done" | "failed";

/** Domain event types the platform emits */
export type DomainEventType =
  | "form.submitted"
  | "contact.created"
  | "contact.updated"
  | "pipeline.stage_changed"
  | "booking.created"
  | "booking.status_changed"
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "email.inbound_matched"
  | "doc.uploaded"
  | "schedule.tick";

export type WorkflowGraph = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type WorkflowNode =
  | { id: string; type: "trigger"; config: { event: string; [k: string]: unknown } }
  | { id: string; type: "condition"; config: Record<string, unknown> }
  | { id: string; type: "action"; config: { action: string; params?: Record<string, unknown> } }
  | { id: string; type: "delay"; config: { amount: number; unit: "minutes" | "hours" | "days" } }
  | { id: string; type: "branch"; config: Record<string, unknown> };

export type WorkflowEdge = {
  from: string;
  to: string;
  when?: string;
};

export type EmitDomainEventInput = {
  organizationId: string;
  type: DomainEventType | string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  /** If set, duplicate emits with same org+key are ignored */
  idempotencyKey?: string;
  /** When true, skip matching workflows (log only) */
  recordOnly?: boolean;
};

export type ActionContext = {
  organizationId: string;
  runId: string;
  eventType: string;
  payload: Record<string, unknown>;
  stepOutputs: Record<string, unknown>;
};

export type ActionResult = {
  ok: boolean;
  output?: Record<string, unknown>;
  error?: string;
  /** Skip retries for permanent failures */
  retryable?: boolean;
};

export type ActionHandler = {
  key: string;
  label: string;
  requiredConnections?: Array<"google" | "twilio" | "jns_mail">;
  execute: (
    params: Record<string, unknown>,
    ctx: ActionContext,
  ) => Promise<ActionResult>;
};
