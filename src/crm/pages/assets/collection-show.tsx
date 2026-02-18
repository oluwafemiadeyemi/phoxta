import { useShow, useList, useMany, useNavigation } from "@refinedev/core";
import { ShowView, ShowViewHeader } from "@crm/components/refine-ui/views/show-view";
import { EditButton } from "@crm/components/refine-ui/buttons/edit";
import { DeleteButton } from "@crm/components/refine-ui/buttons/delete";
import { ListButton } from "@crm/components/refine-ui/buttons/list";
import { Card, CardContent } from "@crm/components/ui/card";
import { Badge } from "@crm/components/ui/badge";
import { Button } from "@crm/components/ui/button";
import {
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Calendar,
  ChevronRight,
  Download,
  Heart,
  FileText,
  Video,
  Type,
  Palette,
} from "lucide-react";
import type { AssetCollection, Asset, AssetTag } from "@crm/types";

function CollectionShowPage() {
  const { query } = useShow<AssetCollection>({
    resource: "assetCollections",
  });
  const { show } = useNavigation();

  const collection = query.data?.data;

  // Fetch child collections
  const {
    query: { data: childCollectionsData },
  } = useList<AssetCollection>({
    resource: "assetCollections",
    filters: [
      {
        field: "parentId",
        operator: "eq",
        value: collection?.id,
      },
    ],
    queryOptions: {
      enabled: !!collection?.id,
    },
  });

  // Fetch parent collection if exists
  const {
    query: { data: parentCollectionData },
  } = useShow<AssetCollection>({
    resource: "assetCollections",
    id: collection?.parentId ?? "",
    queryOptions: {
      enabled: !!collection?.parentId,
    },
  });

  // Fetch assets in this collection
  const {
    query: { data: assetsData },
  } = useList<Asset>({
    resource: "assets",
    filters: [
      {
        field: "collectionIds",
        operator: "in",
        value: collection?.id ? [collection.id] : [],
      },
    ],
    queryOptions: {
      enabled: !!collection?.id,
    },
  });

  const childCollections = childCollectionsData?.data ?? [];
  const parentCollection = parentCollectionData?.data;
  const assets = assetsData?.data ?? [];

  // Fetch tags for assets
  const tagIds = [...new Set(assets.flatMap((asset: Asset) => asset.tagIds))];
  const {
    query: { data: tagsData },
  } = useMany<AssetTag>({
    resource: "assetTags",
    ids: tagIds as string[],
    queryOptions: {
      enabled: tagIds.length > 0,
    },
  });

  const tags = tagsData?.data ?? [];

  const getAssetIcon = (type: Asset["type"]) => {
    switch (type) {
      case "Logo":
      case "Image":
        return <ImageIcon className="h-4 w-4" />;
      case "Document":
        return <FileText className="h-4 w-4" />;
      case "Video":
        return <Video className="h-4 w-4" />;
      case "Font":
        return <Type className="h-4 w-4" />;
      case "Color Palette":
        return <Palette className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getAssetTypeColor = (type: Asset["type"]) => {
    switch (type) {
      case "Logo":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Image":
        return "bg-green-100 text-green-800 border-green-200";
      case "Document":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Video":
        return "bg-red-100 text-red-800 border-red-200";
      case "Font":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Color Palette":
        return "bg-pink-100 text-pink-800 border-pink-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleDownload = (asset: Asset, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (asset?.fileUrl) {
      const link = document.createElement("a");
      link.href = asset.fileUrl;
      link.download = `${asset.name}.${asset.fileFormat.toLowerCase()}`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (query.isLoading) {
    return (
      <ShowView>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </ShowView>
    );
  }

  if (!collection) {
    return (
      <ShowView>
        <div className="text-center py-12">
          <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Collection not found</h3>
        </div>
      </ShowView>
    );
  }

  return (
    <ShowView>
      <ShowViewHeader title={collection.name}>
        <ListButton resource="assetCollections" />
        <EditButton resource="assetCollections" recordItemId={collection.id} />
        <DeleteButton resource="assetCollections" recordItemId={collection.id} />
      </ShowViewHeader>

      {/* Breadcrumb */}
      {parentCollection && (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto"
              onClick={() => show("assetCollections", parentCollection.id)}>
              {parentCollection.name}
            </Button>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">{collection.name}</span>
          </div>
        </div>
      )}

      {/* Collection Info */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FolderOpen className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">{collection.name}</h2>
              {collection.description && <p className="text-muted-foreground mb-4">{collection.description}</p>}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Created {new Date(collection.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <span>
                    {collection.assetCount} {collection.assetCount === 1 ? "asset" : "assets"}
                  </span>
                </div>
                {childCollections.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    <span>
                      {childCollections.length} {childCollections.length === 1 ? "subcollection" : "subcollections"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Child Collections */}
      {childCollections.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Subcollections</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {childCollections.map((child) => (
              <Card
                key={child.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => show("assetCollections", child.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Folder className="h-5 w-5 text-yellow-500 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1 truncate">{child.name}</h4>
                      {child.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{child.description}</p>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {child.assetCount} assets
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Assets in Collection */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Assets in this collection</h3>

        {assets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {assets.map((asset: Asset) => {
              const assetTags = tags.filter((tag: AssetTag) => asset.tagIds.includes(tag.id));

              return (
                <Card key={asset.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />

                    {asset.isFavorite && (
                      <div className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-sm">
                        <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                      </div>
                    )}

                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className={`flex items-center gap-1 ${getAssetTypeColor(asset.type)}`}>
                        {getAssetIcon(asset.type)}
                        <span className="text-xs">{asset.type}</span>
                      </Badge>
                    </div>

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => show("assets", asset.id)}>
                        View Details
                      </Button>
                      <Button size="sm" variant="secondary" onClick={(e) => handleDownload(asset, e)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h4 className="font-semibold text-sm mb-1 line-clamp-1" title={asset.name}>
                      {asset.name}
                    </h4>

                    {asset.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{asset.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span>{asset.fileFormat}</span>
                      <span>•</span>
                      <span>{asset.fileSize}</span>
                      {asset.dimensions && (
                        <>
                          <span>•</span>
                          <span>{asset.dimensions}</span>
                        </>
                      )}
                    </div>

                    {assetTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {assetTags.slice(0, 2).map((tag: AssetTag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="text-xs"
                            style={{
                              backgroundColor: tag.color + "20",
                              color: tag.color,
                              borderColor: tag.color + "40",
                            }}>
                            {tag.name}
                          </Badge>
                        ))}
                        {assetTags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{assetTags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No assets in this collection</h3>
              <p className="text-sm text-muted-foreground">Assets assigned to this collection will appear here</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ShowView>
  );
}

export default CollectionShowPage;
