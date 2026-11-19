import type { WorkflowGraph } from "@/lib/workflows/types";

export type RecipeDefinition = {
  key: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  graph: WorkflowGraph;
};

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
        {
          id: "a2",
          type: "action",
          config: {
            action: "contact.add_note",
            params: {
              contact_id: "{{contact_id}}",
              body: "Speed-to-Lead automation: form submitted. Task created for team follow-up.",
            },
          },
        },
      ],
      edges: [
        { from: "t1", to: "c1" },
        { from: "c1", to: "a1", when: "pass" },
        { from: "a1", to: "a2" },
      ],
    },
  },
  {
    key: "no_show_recovery",
    name: "No-show & cancellation recovery",
    description:
      "When a booking is marked no-show or cancelled, create a rebooking task and log a note.",
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
        {
          id: "a2",
          type: "action",
          config: {
            action: "contact.add_note",
            params: {
              contact_id: "{{contact_id}}",
              body: "No-show recovery automation: booking \"{{title}}\" marked {{status}}.",
            },
          },
        },
      ],
      edges: [
        { from: "t1", to: "c1" },
        { from: "c1", to: "a1", when: "pass" },
        { from: "a1", to: "a2" },
      ],
    },
  },
  {
    key: "pipeline_sla_nudge",
    name: "Pipeline SLA nudge",
    description:
      "Daily: create a task when a lead has sat in the same pipeline stage for 7+ days.",
    category: "Pipeline",
    triggerType: "schedule.tick",
    graph: {
      nodes: [
        { id: "t1", type: "trigger", config: { event: "schedule.tick" } },
        {
          id: "c1",
          type: "condition",
          config: { field: "kind", op: "eq", value: "pipeline_stale" },
        },
        {
          id: "a1",
          type: "action",
          config: {
            action: "task.create",
            params: {
              title: "Pipeline nudge: {{contact_name}}",
              description:
                "Contact has been in stage \"{{stage_name}}\" for {{days_stale}} days. Move them forward or close out.",
              priority: "medium",
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
    key: "win_back",
    name: "Win-back / re-engagement",
    description:
      "Daily: create a follow-up task for contacts with no activity for 30+ days.",
    category: "Leads",
    triggerType: "schedule.tick",
    graph: {
      nodes: [
        { id: "t1", type: "trigger", config: { event: "schedule.tick" } },
        {
          id: "c1",
          type: "condition",
          config: { field: "kind", op: "eq", value: "contact_inactive" },
        },
        {
          id: "a1",
          type: "action",
          config: {
            action: "task.create",
            params: {
              title: "Win-back: {{contact_name}}",
              description:
                "No contact activity for {{days_inactive}} days. Reach out to re-engage.",
              priority: "low",
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
