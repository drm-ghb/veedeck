import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import TasksView from "@/components/tasks/TasksView";

export const metadata = { title: "Zadania" };

export default async function TasksPage() {
  const session = await auth();
  const canEdit = session ? await hasPermission(session, "zadania", 2) : false;
  const canDelete = session ? await hasPermission(session, "zadania", 3) : false;
  return <TasksView canEdit={canEdit} canDelete={canDelete} />;
}
