import { createAdminClient } from "@/lib/supabase/admin";
import { getAction } from "@/lib/workflows/actions/registry";
import { getRecipe } from "@/lib/workflows/recipes";
import type { WorkflowGraph } from "@/lib/workflows/types";

export type PreflightIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
  actionKey?: string;
};

export type PreflightResult = {
  ok: boolean;
  issues: PreflightIssue[];
};

function actionKeysFromGraph(graph: WorkflowGraph): string[] {
  const keys = new Set<string>();
  for (const n of graph.nodes) {
    if (n.type === "action" && n.config.action) {
      keys.add(String(n.config.action));
    }
  }
  return [...keys];
}

export async function preflightRecipe(input: {
  organizationId: string;
  recipeKey: string;
}): Promise<PreflightResult> {
  const recipe = getRecipe(input.recipeKey);
  if (!recipe) {
    return {
      ok: false,
      issues: [
        {
          code: "unknown_recipe",
          message: "Unknown recipe",
          severity: "error",
        },
      ],
    };
  }
  return preflightGraph({
    organizationId: input.organizationId,
    graph: recipe.graph,
  });
}

export async function preflightGraph(input: {
  organizationId: string;
  graph: WorkflowGraph;
}): Promise<PreflightResult> {
  const issues: PreflightIssue[] = [];
  const actionKeys = actionKeysFromGraph(input.graph);
  const admin = createAdminClient();

  const required = new Set<"google" | "twilio" | "jns_mail">();
  for (const key of actionKeys) {
    const handler = getAction(key);
    if (!handler) {
      issues.push({
        code: "unknown_action",
        message: `Recipe references unknown action "${key}".`,
        severity: "error",
        actionKey: key,
      });
      continue;
    }
    for (const c of handler.requiredConnections ?? []) {
      required.add(c);
    }
  }

  if (required.has("google")) {
    const { data: google } = await admin
      .from("connections")
      .select("connected_email, needs_reauth")
      .eq("organization_id", input.organizationId)
      .eq("provider", "google")
      .maybeSingle();
    if (!google?.connected_email) {
      issues.push({
        code: "google_missing",
        message:
          "Connect Google in Connections before activating recipes that send Gmail or calendar actions.",
        severity: "error",
      });
    } else if (google.needs_reauth) {
      issues.push({
        code: "google_reauth",
        message:
          "Google needs reconnection (token expired). Reconnect in Connections.",
        severity: "error",
      });
    }
  }

  if (required.has("twilio")) {
    const { data: twilio } = await admin
      .from("twilio_connections")
      .select("from_number")
      .eq("organization_id", input.organizationId)
      .maybeSingle();
    if (!twilio?.from_number) {
      issues.push({
        code: "twilio_missing",
        message:
          "Connect Twilio (SMS number) in Connections before activating SMS recipes.",
        severity: "error",
      });
    }
  }

  if (required.has("jns_mail")) {
    if (!process.env.RESEND_API_KEY) {
      issues.push({
        code: "jns_mail_missing",
        message:
          "Outbound email (Resend) is not configured on this environment.",
        severity: "error",
      });
    }
  }

  const hard = issues.filter((i) => i.severity === "error");
  return { ok: hard.length === 0, issues };
}

/** Runtime check before a single action executes */
export async function preflightActionConnections(
  organizationId: string,
  actionKey: string,
): Promise<PreflightIssue | null> {
  const handler = getAction(actionKey);
  if (!handler?.requiredConnections?.length) return null;

  const result = await preflightGraph({
    organizationId,
    graph: {
      nodes: [
        {
          id: "a",
          type: "action",
          config: { action: actionKey },
        },
      ],
      edges: [],
    },
  });

  return result.issues.find((i) => i.severity === "error") ?? null;
}
