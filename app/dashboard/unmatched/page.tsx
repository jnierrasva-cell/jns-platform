import { redirect } from "next/navigation";

export default function UnmatchedPage() {
  redirect("/dashboard/autopilot?tab=unmatched");
}