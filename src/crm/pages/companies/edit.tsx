import { useParams } from "react-router";
import { EditView, EditViewHeader } from "@crm/components/refine-ui/views/edit-view";
import { CompanyForm } from "./form";

export default function CompanyEdit() {
  const { id } = useParams<{ id: string }>();

  return (
    <EditView>
      <EditViewHeader title="Edit Company" />
      <CompanyForm action="edit" id={id} />
    </EditView>
  );
}
