import { EditView, EditViewHeader } from "@crm/components/refine-ui/views/edit-view";
import { ListButton } from "@crm/components/refine-ui/buttons/list";
import { ShowButton } from "@crm/components/refine-ui/buttons/show";
import { DeleteButton } from "@crm/components/refine-ui/buttons/delete";
import { CollectionForm } from "./collection-form";

function CollectionEditPage() {
  return (
    <EditView>
      <EditViewHeader title="Edit Collection">
        <ListButton resource="assetCollections" />
        <ShowButton resource="assetCollections" />
        <DeleteButton resource="assetCollections" />
      </EditViewHeader>

      <CollectionForm action="edit" />
    </EditView>
  );
}

export default CollectionEditPage;
