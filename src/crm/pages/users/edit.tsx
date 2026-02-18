import { useParams } from "react-router";
import { EditView, EditViewHeader } from "@crm/components/refine-ui/views/edit-view";
import { UserForm } from "./form";

export default function UsersEdit() {
  const { id } = useParams<{ id: string }>();

  return (
    <EditView>
      <EditViewHeader title={`Edit User #${id}`} />
      <UserForm action="edit" id={id} />
    </EditView>
  );
}
