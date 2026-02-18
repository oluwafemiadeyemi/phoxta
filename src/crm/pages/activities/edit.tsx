import { useParams } from "react-router";
import { EditView, EditViewHeader } from "@crm/components/refine-ui/views/edit-view";
import { ActivityForm } from "./form";

export default function ActivitiesEdit() {
  const { id } = useParams();

  return (
    <EditView>
      <EditViewHeader title={`Edit Activity #${id}`} />
      <ActivityForm action="edit" id={id} />
    </EditView>
  );
}
