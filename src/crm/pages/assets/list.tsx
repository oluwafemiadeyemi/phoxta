import { useList, useMany } from "@refinedev/core";
import { ListView, ListViewHeader } from "@crm/components/refine-ui/views/list-view";
import { CreateButton } from "@crm/components/refine-ui/buttons/create";
import { Card, CardContent } from "@crm/components/ui/card";
import { Badge } from "@crm/components/ui/badge";
import { Button } from "@crm/components/ui/button";
import { Heart, Download, Image as ImageIcon, FileText, Video, Type, Palette, Upload, Search, X, Folder, Tag } from "lucide-react";
import type { Asset, AssetTag, AssetCollection } from "@crm/types";
import type React from "react";
import { useState, useEffect } from "react";
import { Input } from "@crm/components/ui/input";
import { AssetFavoriteButton } from "@crm/components/asset-favorite-button";
import { supabaseClient } from "@crm/lib/supabase";
import { Alert, AlertDescription } from "@crm/components/ui/alert";
import { Link } from "react-router";

function AssetGalleryPage() {
  const [selectedType, setSelectedType] = useState<Asset["type"] | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isCreatingAssets, setIsCreatingAssets] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  // Fetch all tags for the filter section
  const {
    query: { data: allTagsData },
  } = useList<AssetTag>({
    resource: "assetTags",
    pagination: {
      mode: "off",
    },
  });

  const allTags = allTagsData?.data ?? [];

  const {
    query: { data: assetsData, isLoading, refetch },
  } = useList<Asset>({
    resource: "assets",
    filters: [
      ...(selectedType !== "All"
        ? [
            {
              field: "type",
              operator: "eq" as const,
              value: selectedType,
            },
          ]
        : []),
      ...(searchQuery
        ? [
            {
              operator: "or" as const,
              value: [
                {
                  field: "name",
                  operator: "contains" as const,
                  value: searchQuery,
                },
                {
                  field: "description",
                  operator: "contains" as const,
                  value: searchQuery,
                },
              ],
            },
          ]
        : []),
      ...(selectedTagIds.length > 0
        ? [
            {
              field: "tagIds",
              operator: "in" as const,
              value: selectedTagIds,
            },
          ]
        : []),
      ...(showFavoritesOnly
        ? [
            {
              field: "isFavorite",
              operator: "eq" as const,
              value: true,
            },
          ]
        : []),
    ],
  });

  const assets = assetsData?.data ?? [];

  // Auto-create brand assets if user has none
  useEffect(() => {
    const autoCreateAssets = async () => {
      // Only run if we're not loading and have 0 assets
      if (isLoading || assets.length > 0 || isCreatingAssets) return;

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

        // Refresh the assets list
        await refetch();
      } catch (error) {
        console.error("Failed to auto-create brand assets:", error);
        setCreationError(error instanceof Error ? error.message : "Failed to create demo assets");
      } finally {
        setIsCreatingAssets(false);
      }
    };

    autoCreateAssets();
  }, [isLoading, assets.length, isCreatingAssets, refetch]);

  // Extract tag IDs from all assets
  const tagIds = [...new Set(assets.flatMap((asset: Asset) => asset.tagIds))];

  // Extract collection IDs from all assets
  const collectionIds = [...new Set(assets.flatMap((asset: Asset) => asset.collectionIds))];

  // Fetch tags
  const {
    query: { data: tagsData },
  } = useMany<AssetTag>({
    resource: "assetTags",
    ids: tagIds as string[],
    queryOptions: {
      enabled: tagIds.length > 0,
    },
  });

  // Fetch collections
  const {
    query: { data: collectionsData },
  } = useMany<AssetCollection>({
    resource: "assetCollections",
    ids: collectionIds as string[],
    queryOptions: {
      enabled: collectionIds.length > 0,
    },
  });

  const tags = tagsData?.data ?? [];
  const collections = collectionsData?.data ?? [];
  const selectedTags = allTags.filter((tag) => selectedTagIds.includes(tag.id));

  const getAssetIcon = (type: Asset["type"]) => {
    switch (type) {
      case "Logo":
        return <ImageIcon className="h-4 w-4" />;
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

  const assetTypes: Array<{ label: string; value: Asset["type"] | "All"; icon: React.ReactNode }> = [
    { label: "All Assets", value: "All", icon: <ImageIcon className="h-4 w-4" /> },
    { label: "Logos", value: "Logo", icon: <ImageIcon className="h-4 w-4" /> },
    { label: "Images", value: "Image", icon: <ImageIcon className="h-4 w-4" /> },
    { label: "Documents", value: "Document", icon: <FileText className="h-4 w-4" /> },
    { label: "Videos", value: "Video", icon: <Video className="h-4 w-4" /> },
    { label: "Fonts", value: "Font", icon: <Type className="h-4 w-4" /> },
    { label: "Color Palettes", value: "Color Palette", icon: <Palette className="h-4 w-4" /> },
  ];

  const assetTypeCounts = assets.reduce((acc, asset) => {
    acc[asset.type] = (acc[asset.type] ?? 0) + 1;
    return acc;
  }, {} as Record<Asset["type"], number>);

  const favoriteCount = assets.filter((asset) => asset.isFavorite).length;

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const clearAllFilters = () => {
    setSelectedType("All");
    setSearchQuery("");
    setSelectedTagIds([]);
    setShowFavoritesOnly(false);
  };

  const hasActiveFilters =
    selectedType !== "All" || searchQuery !== "" || selectedTagIds.length > 0 || showFavoritesOnly;

  const handleDownload = (asset: Asset, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (asset?.fileUrl) {
      // Create a temporary anchor element to trigger download
      const link = document.createElement("a");
      link.href = asset.fileUrl;
      link.download = `${asset.name}.${asset.fileFormat.toLowerCase()}`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isLoading || isCreatingAssets) {
    return (
      <ListView>
        <ListViewHeader title="Brand Assets" />

        {isCreatingAssets && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertDescription className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Setting up your brand asset library...</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Filter Buttons Skeleton */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-9 w-24 bg-muted rounded-md animate-pulse" />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-video bg-muted animate-pulse" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </ListView>
    );
  }

  return (
    <ListView>
      <div className="mb-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <ListViewHeader title="Brand Assets" canCreate={false} />
            <p className="text-sm text-muted-foreground mt-1">
              Centralize logos, templates, and brand files with instant access for your team.
            </p>
          </div>
          <CreateButton resource="assets">
            <Upload className="h-4 w-4 mr-2" />
            Upload Asset
          </CreateButton>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#1D3A7D]/10">
                  <ImageIcon className="h-5 w-5 text-[#1D3A7D]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Assets</p>
                  <p className="text-2xl font-semibold text-[#1D3A7D]">{assets.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <Heart className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Favorites</p>
                  <p className="text-2xl font-semibold">{favoriteCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Tag className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tags in Use</p>
                  <p className="text-2xl font-semibold">{tags.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Folder className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Collections</p>
                  <p className="text-2xl font-semibold">{collections.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {creationError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>Failed to create demo assets: {creationError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
        <Card className="h-fit">
          <CardContent className="p-4 space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick Filters</p>
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="w-full justify-start gap-2">
                <Heart className={`h-4 w-4 ${showFavoritesOnly ? "fill-red-500 text-red-500" : ""}`} />
                Favorites
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asset Types</p>
              <div className="flex flex-col gap-2">
                {assetTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant={selectedType === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType(type.value)}
                    className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      {type.icon}
                      {type.label}
                    </span>
                    {type.value !== "All" && (
                      <span className="text-xs text-muted-foreground">
                        {assetTypeCounts[type.value as Asset["type"]] ?? 0}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {allTags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</p>
                  {selectedTagIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTagIds([])}
                      className="h-auto px-2 text-xs">
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag: AssetTag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <Badge
                        key={tag.id}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-[1.02]"
                        style={{
                          backgroundColor: isSelected ? tag.color : "transparent",
                          color: isSelected ? "white" : tag.color,
                          borderColor: tag.color,
                        }}
                        onClick={() => toggleTag(tag.id)}>
                        {tag.name}
                        {isSelected && <X className="ml-1 h-3 w-3" />}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {(selectedType !== "All" || showFavoritesOnly || selectedTags.length > 0 || searchQuery) && (
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Active filters:</span>
                  {searchQuery && <Badge variant="outline">Search: {searchQuery}</Badge>}
                  {selectedType !== "All" && <Badge variant="outline">Type: {selectedType}</Badge>}
                  {showFavoritesOnly && <Badge variant="outline">Favorites</Badge>}
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      style={{ borderColor: tag.color, color: tag.color }}>
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              {assets.length} {assets.length === 1 ? "asset" : "assets"}{" "}
              {selectedType !== "All" ? `in ${selectedType}` : "available"}
              {selectedTagIds.length > 0 && ` with ${selectedTagIds.length} tag${selectedTagIds.length > 1 ? "s" : ""}`}
              {showFavoritesOnly && " (favorites only)"}
            </p>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear all filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {assets.map((asset: Asset) => {
              const assetTags = tags.filter((tag: AssetTag) => asset.tagIds.includes(tag.id));
              const assetCollections = collections.filter((collection: AssetCollection) =>
                asset.collectionIds.includes(collection.id),
              );

              return (
                <Card key={asset.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />

                    <div className="absolute top-2 right-2">
                      <AssetFavoriteButton asset={asset} variant="ghost" size="icon" />
                    </div>

                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className={`flex items-center gap-1 ${getAssetTypeColor(asset.type)}`}>
                        {getAssetIcon(asset.type)}
                        <span className="text-xs">{asset.type}</span>
                      </Badge>
                    </div>

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" asChild>
                        <Link to={`/assets/show/${asset.id}`}>View Details</Link>
                      </Button>
                      <Button size="sm" variant="secondary" onClick={(e) => handleDownload(asset, e)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-1" title={asset.name}>
                      {asset.name}
                    </h3>

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

                    <div className="text-xs text-muted-foreground">
                      Updated {asset.updatedAt ? new Date(asset.updatedAt).toLocaleDateString() : "—"}
                    </div>

                    {assetCollections.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {assetCollections.slice(0, 2).map((collection: AssetCollection) => (
                          <Badge key={collection.id} variant="outline" className="text-xs">
                            {collection.name}
                          </Badge>
                        ))}
                        {assetCollections.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{assetCollections.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}

                    {assetTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {assetTags.slice(0, 3).map((tag: AssetTag) => (
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
                        {assetTags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{assetTags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {assets.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No assets found</h3>
              <p className="text-sm text-muted-foreground">Start by uploading your first brand asset</p>
            </div>
          )}
        </div>
      </div>
    </ListView>
  );
}

export default AssetGalleryPage;
