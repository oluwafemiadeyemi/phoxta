import { useList, useDelete, useNavigation } from "@refinedev/core";
import { ListView, ListViewHeader } from "@crm/components/refine-ui/views/list-view";
import { CreateButton } from "@crm/components/refine-ui/buttons/create";
import { EditButton } from "@crm/components/refine-ui/buttons/edit";
import { DeleteButton } from "@crm/components/refine-ui/buttons/delete";
import { Card, CardContent, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Badge } from "@crm/components/ui/badge";
import { Button } from "@crm/components/ui/button";
import { Folder, FolderOpen, ChevronRight, ChevronDown, Image as ImageIcon, Pencil, Trash } from "lucide-react";
import type { AssetCollection } from "@crm/types";
import { useState, useEffect } from "react";
import { supabaseClient } from "@crm/lib/supabase";
import { Alert, AlertDescription } from "@crm/components/ui/alert";

interface CollectionTreeItemProps {
  collection: AssetCollection;
  allCollections: AssetCollection[];
  level: number;
}

function CollectionTreeItem({ collection, allCollections, level }: CollectionTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { show } = useNavigation();

  const childCollections = allCollections.filter((c) => c.parentId === collection.id);
  const hasChildren = childCollections.length > 0;

  return (
    <div>
      <Card className="mb-2 hover:shadow-md transition-shadow cursor-pointer" style={{ marginLeft: `${level * 24}px` }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1" onClick={() => show("assetCollections", collection.id)}>
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    className="hover:bg-muted p-1 rounded">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                )}
                {!hasChildren && <div className="w-6" />}

                {isExpanded || !hasChildren ? (
                  <FolderOpen className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Folder className="h-5 w-5 text-yellow-500" />
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">{collection.name}</h3>
                {collection.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{collection.description}</p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  <span>{collection.assetCount} assets</span>
                </Badge>

                {collection.parentId && (
                  <Badge variant="outline" className="text-xs">
                    Subcollection
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
              <EditButton resource="assetCollections" recordItemId={collection.id} variant="ghost" size="sm">
                <Pencil className="h-4 w-4" />
              </EditButton>
              <DeleteButton resource="assetCollections" recordItemId={collection.id} variant="ghost" size="sm">
                <Trash className="h-4 w-4" />
              </DeleteButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Render child collections */}
      {hasChildren && isExpanded && (
        <div>
          {childCollections.map((child) => (
            <CollectionTreeItem key={child.id} collection={child} allCollections={allCollections} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetCollectionsPage() {
  const [isCreatingAssets, setIsCreatingAssets] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  const {
    query: { data: collectionsData, isLoading, refetch },
  } = useList<AssetCollection>({
    resource: "assetCollections",
    pagination: {
      mode: "off",
    },
    sorters: [
      {
        field: "name",
        order: "asc",
      },
    ],
  });

  const collections = collectionsData?.data ?? [];

  // Auto-create brand assets and collections if user has none
  useEffect(() => {
    const autoCreateAssets = async () => {
      // Only run if we're not loading and have 0 collections
      if (isLoading || collections.length > 0 || isCreatingAssets) return;

      try {
        setIsCreatingAssets(true);
        setCreationError(null);

        // Get current user
        const {
          data: { user },
        } = await supabaseClient.auth.getUser();

        if (!user) {
          throw new Error("No authenticated user found");
        }

        // Call the RPC function to create assets
        const { error } = await supabaseClient.rpc("auto_create_brand_assets", {
          target_user_id: user.id,
        });

        if (error) throw error;

        // Refresh the collections list
        await refetch();
      } catch (error) {
        console.error("Failed to auto-create brand assets:", error);
        setCreationError(error instanceof Error ? error.message : "Failed to create demo collections");
      } finally {
        setIsCreatingAssets(false);
      }
    };

    autoCreateAssets();
  }, [isLoading, collections.length, isCreatingAssets, refetch]);

  // Get root collections (those without a parent)
  const rootCollections = collections.filter((c) => !c.parentId);

  if (isLoading || isCreatingAssets) {
    return (
      <ListView>
        <ListViewHeader title="Collections" />

        {isCreatingAssets && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertDescription className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Setting up your brand asset library...</span>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-12 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </ListView>
    );
  }

  const totalAssets = collections.reduce((sum, c) => sum + c.assetCount, 0);

  return (
    <ListView>
      <div className="mb-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <ListViewHeader title="Asset Collections" canCreate={false} />
            <p className="text-sm text-muted-foreground mt-1">
              Organize your brand assets into structured libraries with nested collections.
            </p>
          </div>
          <CreateButton resource="assetCollections">
            <Folder className="h-4 w-4 mr-2" />
            New Collection
          </CreateButton>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#1D3A7D]/10 rounded-lg">
                  <Folder className="h-5 w-5 text-[#1D3A7D]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Collections</p>
                  <p className="text-2xl font-bold text-[#1D3A7D]">{collections.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Root Collections</p>
                  <p className="text-2xl font-bold">{rootCollections.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <ImageIcon className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-2xl font-bold">{totalAssets}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {creationError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>Failed to create demo collections: {creationError}</AlertDescription>
        </Alert>
      )}

      {/* Collections Tree */}
      {rootCollections.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Collections</CardTitle>
          </CardHeader>
          <CardContent>
            {rootCollections.map((collection) => (
              <CollectionTreeItem key={collection.id} collection={collection} allCollections={collections} level={0} />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No collections yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first collection to organize your brand assets
            </p>
            <CreateButton resource="assetCollections">
              <Folder className="h-4 w-4 mr-2" />
              Create Collection
            </CreateButton>
          </CardContent>
        </Card>
      )}
    </ListView>
  );
}

export default AssetCollectionsPage;
