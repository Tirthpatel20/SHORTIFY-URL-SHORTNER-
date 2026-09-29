import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AnalyticsView from "./analytics-view";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <AnalyticsView />;
}