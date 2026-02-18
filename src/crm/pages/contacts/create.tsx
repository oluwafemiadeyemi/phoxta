import { CreateView } from "@crm/components/refine-ui/views/create-view";
import { ContactForm } from "./form";

export default function ContactCreate() {
  return (
    <CreateView>
      <ContactForm action="create" />
    </CreateView>
  );
}
