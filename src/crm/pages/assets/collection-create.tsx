import { CreateView, CreateViewHeader } from "@crm/components/refine-ui/views/create-view";
import { ListButton } from "@crm/components/refine-ui/buttons/list";
import { CollectionForm } from "./collection-form";

function CollectionCreatePage() {
  return (
    <CreateView>
      <CreateViewHeader title="Create Collection">
        <ListButton resource="assetCollections" />
      </CreateViewHeader>

      <CollectionForm action="create" />
    </CreateView>
  );
}

export default CollectionCreatePage;
