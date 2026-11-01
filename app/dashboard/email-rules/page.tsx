import { redirect } from "next/navigation";

export default function EmailRulesPage() {
  redirect("/dashboard/autopilot?tab=rules");
}