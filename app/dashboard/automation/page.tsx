import { redirect } from "next/navigation";

export default function AutomationPage() {
  redirect("/dashboard/autopilot?tab=status");
}