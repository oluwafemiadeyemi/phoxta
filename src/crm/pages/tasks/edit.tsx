import { useParams } from "react-router";
import { EditView, EditViewHeader } from "@crm/components/refine-ui/views/edit-view";
import { TaskForm } from "./form";

export default function TasksEdit() {
  const { id } = useParams<{ id: string }>();

  return (
    <EditView>
      <EditViewHeader title={`Edit Task #${id}`} />
      <TaskForm action="edit" id={id} />
    </EditView>
  );
}
