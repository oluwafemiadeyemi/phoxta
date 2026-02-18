import { CreateView, CreateViewHeader } from "@crm/components/refine-ui/views/create-view";
import { CompanyForm } from "./form";

export default function CompanyCreate() {
  return (
    <CreateView>
      <CreateViewHeader title="Create Company" />
      <CompanyForm action="create" />
    </CreateView>
  );
}
