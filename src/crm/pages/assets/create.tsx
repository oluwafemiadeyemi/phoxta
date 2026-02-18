import { CreateView, CreateViewHeader } from "@crm/components/refine-ui/views/create-view";
import { AssetForm } from "./form";

export default function AssetsCreate() {
  return (
    <CreateView>
      <CreateViewHeader title="Upload Brand Asset" />
      <AssetForm action="create" />
    </CreateView>
  );
}
