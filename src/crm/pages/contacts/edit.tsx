import { EditView, EditViewHeader } from "@crm/components/refine-ui/views/edit-view";
import { ContactForm } from "./form";
import { useParams } from "react-router";

export default function ContactEdit() {
  const { id } = useParams<{ id: string }>();

  return (
    <EditView>
      <EditViewHeader title={`Edit Contact #${id}`} />
      <ContactForm action="edit" id={id} />
    </EditView>
  );
}
