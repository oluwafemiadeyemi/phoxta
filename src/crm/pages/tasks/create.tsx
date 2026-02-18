import { CreateView, CreateViewHeader } from "@crm/components/refine-ui/views/create-view";
import { TaskForm } from "./form";
import { useSearchParams } from "react-router";

export default function TasksCreate() {
  const [searchParams] = useSearchParams();
  const title = searchParams.get("title") ?? "";
  const forToday = searchParams.get("for") === "today";
  const todayDue = forToday ? new Date().toISOString() : "";

  return (
    <CreateView>
      <CreateViewHeader title="Create Task" />
      <TaskForm
        action="create"
        initialValues={{
          title: title || "",
          dueDate: todayDue,
          stage: forToday ? "Todo" : "Unassigned",
        }}
      />
    </CreateView>
  );
}
