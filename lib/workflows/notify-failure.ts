import { createAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/email/resend";

/**
 * Email org managers when a workflow run fails.
 * Best-effort — never throws to the runner.
 */
export async function notifyWorkflowFailure(input: {
  organizationId: string;
  runId: string;
  error: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();

    const [{ data: run }, { data: members }, { data: org }] = await Promise.all([
      admin
        .from("workflow_runs")
        .select("id, trigger_event, workflow_id, started_at, workflows(name, key)")
        .eq("id", input.runId)
        .maybeSingle(),
      admin
        .from("org_members")
        .select("user_id, role")
        .eq("organization_id", input.organizationId)
        .in("role", ["ceo", "admin"]),
      admin
        .from("organizations")
        .select("name")
        .eq("id", input.organizationId)
        .maybeSingle(),
    ]);

    const userIds = (members ?? []).map((m) => m.user_id as string);
    if (userIds.length === 0) return;

    const { data: profiles } = await admin
      .from("profiles")
      .select("email")
      .in("id", userIds);

    const emails = (profiles ?? [])
      .map((p) => p.email)
      .filter((e): e is string => Boolean(e && e.includes("@")));

    if (emails.length === 0) return;

    const wf =
      run?.workflows && typeof run.workflows === "object"
        ? (run.workflows as { name?: string; key?: string })
        : null;
    const name = wf?.name || wf?.key || run?.trigger_event || "Workflow";
    const orgName = org?.name || "Your organization";

    await sendResendEmail({
      to: emails,
      subject: `[JNS] Workflow failed: ${name}`,
      text: [
        `${orgName}`,
        ``,
        `A workflow run failed.`,
        `Workflow: ${name}`,
        `Trigger: ${run?.trigger_event ?? "unknown"}`,
        `Run id: ${input.runId}`,
        `Error: ${input.error}`,
        ``,
        `Open Automations in JNS to inspect the run and retry if needed.`,
        `https://jnsystem.app/dashboard/automation`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[notifyWorkflowFailure]", err);
  }
}
