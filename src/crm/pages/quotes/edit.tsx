import { EditView, EditViewHeader } from "@crm/components/refine-ui/views/edit-view";
import { QuoteForm } from "./form";
import { useParams } from "react-router";

export default function QuoteEdit() {
  const { id } = useParams<{ id: string }>();

  return (
    <EditView>
      <EditViewHeader title={`Edit Quote #${id}`} />
      <QuoteForm action="edit" id={id} />
    </EditView>
  );
}
