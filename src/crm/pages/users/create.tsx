import { CreateView } from "@crm/components/refine-ui/views/create-view";
import { UserForm } from "./form";

export default function UsersCreate() {
  return (
    <CreateView>
      <UserForm action="create" />
    </CreateView>
  );
}
