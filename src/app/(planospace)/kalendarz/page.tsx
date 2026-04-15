import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CalendarView from "@/components/calendar/CalendarView";

export default async function KalendarzPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <CalendarView />;
}
