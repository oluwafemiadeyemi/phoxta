import { EditView, EditViewHeader } from "@crm/components/refine-ui/views/edit-view";
import { DealForm } from "./form";
import { useParams } from "react-router";

export default function DealEdit() {
  const { id } = useParams<{ id: string }>();

  return (
    <EditView>
      <EditViewHeader title={`Edit Deal #${id}`} />
      <DealForm action="edit" id={id} />
    </EditView>
  );
}
