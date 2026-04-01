import { redirect } from "next/navigation";

/** Course audit work happens under /audit/courses; student submission grid was removed from this flow. */
export default function AuditPage() {
  redirect("/audit/courses");
}
