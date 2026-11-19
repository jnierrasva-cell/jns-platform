import type { WorkflowGraph } from "@/lib/workflows/types";

export type RecipeDefinition = {
  key: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  graph: WorkflowGraph;
};

/**
 * High-ROI system recipes. Installed per-org as active workflows.
 * Legacy toggles stay on org_automations until a later migration.
 */
export const SYSTEM_RECIPES: RecipeDefinition[] = [
  {
    key: "speed_to_lead",
    name: "Speed-to-Lead",
    description:
      "When someone submits an intake form, create a high-priority follow-up task so nothing sits unworked.",
    category: "Leads",
    triggerType: "form.submitted",
    graph: {
      nodes: [
        { id: "t1", type: "trigger", config: { event: "form.submitted" } },
        { id: "c1", type: "condition", config: { field: "email", op: "exists" } },
        {
          id: "a1",
          type: "action",
          config: {
            action: "task.create",
            params: {
              title: "Follow up: {{name}} (form)",
              description:
                "New intake form lead. Email: {{email}}. Phone: {{phone}}.",
              priority: "high",
              contact_id: "{{contact_id}}",
            },
          },
        },
      ],
      edges: [
        { from: "t1", to: "c1" },
        { from: "c1", to: "a1", when: "pass" },
      ],
    },
  },
  {
    key: "no_show_recovery",
    name: "No-show & cancellation recovery",
    description:
      "When a booking is marked no-show or cancelled, create a rebooking task so the team follows up.",
    category: "Bookings",
    triggerType: "booking.status_changed",
    graph: {
      nodes: [
        {
          id: "t1",
          type: "trigger",
          config: { event: "booking.status_changed" },
        },
        {
          id: "c1",
          type: "condition",
          config: {
            field: "status",
            op: "in",
            value: ["no_show", "cancelled"],
          },
        },
        {
          id: "a1",
          type: "action",
          config: {
            action: "task.create",
            params: {
              title: "Rebook: {{title}}",
              description:
                "Booking marked {{status}}. Reach out to recover the appointment.",
              priority: "high",
              contact_id: "{{contact_id}}",
            },
          },
        },
      ],
      edges: [
        { from: "t1", to: "c1" },
        { from: "c1", to: "a1", when: "pass" },
      ],
    },
  },
];

export function getRecipe(key: string): RecipeDefinition | undefined {
  return SYSTEM_RECIPES.find((r) => r.key === key);
}
