import { CreateView } from "@crm/components/refine-ui/views/create-view";
import { QuoteForm } from "./form";

export default function QuoteCreate() {
  return (
    <CreateView>
      <QuoteForm action="create" />
    </CreateView>
  );
}
