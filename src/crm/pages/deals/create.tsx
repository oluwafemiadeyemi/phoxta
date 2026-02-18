import { CreateView } from "@crm/components/refine-ui/views/create-view";
import { DealForm } from "./form";

export default function DealCreate() {
  return (
    <CreateView>
      <DealForm action="create" />
    </CreateView>
  );
}
