import { useShow, useMany, useList } from "@refinedev/core";
import { ShowView, ShowViewHeader } from "@crm/components/refine-ui/views/show-view";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Badge } from "@crm/components/ui/badge";
import { Button } from "@crm/components/ui/button";
import { Separator } from "@crm/components/ui/separator";
import { AssetCollectionManager } from "@crm/components/asset-collection-manager";
import { UsageGuidelinesDisplay } from "@crm/components/usage-guidelines-display";
import { AssetShareDialog } from "@crm/components/asset-share-dialog";
import { AssetDownloadButton } from "@crm/components/asset-download-button";
import { AssetFavoriteButton } from "@crm/components/asset-favorite-button";
import {
  Heart,
  Download,
  Share2,
  Calendar,
  FileText,
  Image as ImageIcon,
  Video,
  Type,
  Palette,
  Folder,
  Tag,
  User,
  HardDrive,
  Ruler,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { Asset, AssetTag, AssetCollection, UsageGuideline, ColorPalette, FontAsset } from "@crm/types";

export default function AssetShowPage() {
  const {
    query: { data, isLoading },
  } = useShow<Asset>();

  const asset = data?.data;

  // Fetch related tags
  const {
    query: { data: tagsData },
  } = useMany<AssetTag>({
    resource: "assetTags",
    ids: asset?.tagIds || [],
    queryOptions: {
      enabled: !!asset && asset.tagIds.length > 0,
    },
  });

  // Fetch related collections
  const {
    query: { data: collectionsData },
  } = useMany<AssetCollection>({
    resource: "assetCollections",
    ids: asset?.collectionIds || [],
    queryOptions: {
      enabled: !!asset && asset.collectionIds.length > 0,
    },
  });

  // Fetch usage guidelines for this asset
  const {
    result: { data: usageGuidelines = [] },
  } = useList<UsageGuideline>({
    resource: "usageGuidelines",
    filters: [
      {
        field: "assetId",
        operator: "eq",
        value: asset?.id || "",
      },
    ],
    queryOptions: {
      enabled: !!asset?.id,
    },
  });

  // Fetch color palette if this is a color palette asset
  const {
    result: { data: colorPalettes = [] },
  } = useList<ColorPalette>({
    resource: "colorPalettes",
    filters: [
      {
        field: "assetId",
        operator: "eq",
        value: asset?.id || "",
      },
    ],
    queryOptions: {
      enabled: !!asset?.id && asset.type === "Color Palette",
    },
  });

  // Fetch font details if this is a font asset
  const {
    result: { data: fontAssets = [] },
  } = useList<FontAsset>({
    resource: "fontAssets",
    filters: [
      {
        field: "assetId",
        operator: "eq",
        value: asset?.id || "",
      },
    ],
    queryOptions: {
      enabled: !!asset?.id && asset.type === "Font",
    },
  });

  const tags = tagsData?.data ?? [];
  const collections = collectionsData?.data ?? [];
  const usageGuideline = usageGuidelines[0];
  const colorPalette = colorPalettes[0];
  const fontAsset = fontAssets[0];

  const getAssetIcon = (type: Asset["type"]) => {
    switch (type) {
      case "Logo":
        return <ImageIcon className="h-5 w-5" />;
      case "Image":
        return <ImageIcon className="h-5 w-5" />;
      case "Document":
        return <FileText className="h-5 w-5" />;
      case "Video":
        return <Video className="h-5 w-5" />;
      case "Font":
        return <Type className="h-5 w-5" />;
      case "Color Palette":
        return <Palette className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
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

  const handleShare = () => {
    if (asset) {
      const shareUrl = window.location.href;
      navigator.clipboard.writeText(shareUrl);
      // You could also add a toast notification here
      alert("Link copied to clipboard!");
    }
  };

  if (isLoading || !asset) {
    return (
      <ShowView>
        <ShowViewHeader title="Loading..." />
        <div className="animate-pulse space-y-4">
          <div className="h-96 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-64 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </ShowView>
    );
  }

  return (
    <ShowView>
      <ShowViewHeader title={asset.name}>
        <div className="flex items-center gap-2">
          <AssetFavoriteButton asset={asset} variant="outline" size="default" showLabel />
          <AssetDownloadButton asset={asset} />
          <AssetCollectionManager assetId={asset.id} currentCollectionIds={asset.collectionIds} />
          <AssetShareDialog assetName={asset.name} />
        </div>
      </ShowViewHeader>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className={`flex items-center gap-2 ${getAssetTypeColor(asset.type)}`}>
                {getAssetIcon(asset.type)}
                <span>{asset.type}</span>
              </Badge>
              <div className="text-sm text-muted-foreground">Format: {asset.fileFormat}</div>
              <Separator orientation="vertical" className="h-4" />
              <div className="text-sm text-muted-foreground">Size: {asset.fileSize}</div>
              {asset.dimensions && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="text-sm text-muted-foreground">Dimensions: {asset.dimensions}</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Asset Preview */}
        <Card>
          <CardContent className="p-6">
            <div className="relative bg-muted rounded-lg overflow-hidden shadow-sm">
              {asset.type === "Video" ? (
                <video src={asset.fileUrl} controls className="w-full max-h-[600px] object-contain mx-auto">
                  Your browser does not support the video tag.
                </video>
              ) : asset.type === "Color Palette" && colorPalette ? (
                <div className="p-8">
                  <div className="max-w-4xl mx-auto">
                    <h3 className="text-2xl font-bold mb-2">{colorPalette.name}</h3>
                    <p className="text-muted-foreground mb-6">{colorPalette.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {colorPalette.colors.map((color) => (
                        <div key={color.id} className="space-y-2">
                          <div className="h-24 rounded-lg shadow-sm border" style={{ backgroundColor: color.hex }} />
                          <div className="space-y-1">
                            <p className="font-semibold text-sm">{color.name}</p>
                            <p className="text-xs text-muted-foreground">{color.hex}</p>
                            <p className="text-xs text-muted-foreground">{color.rgb}</p>
                            <p className="text-xs text-muted-foreground italic">{color.usage}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : asset.type === "Font" && fontAsset ? (
                <div className="p-8">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{fontAsset.fontFamily}</h3>
                      <p className="text-muted-foreground mb-4">{fontAsset.usage}</p>
                    </div>
                    <div className="space-y-4">
                      <div className="text-4xl font-bold">{fontAsset.sampleText}</div>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground">Variants</h4>
                        {fontAsset.variants.map((variant) => (
                          <div key={variant.id} className="flex items-center gap-3">
                            <Badge variant="outline">
                              {variant.weight} - {variant.style}
                            </Badge>
                            <span className="text-sm">{variant.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : asset.type === "Document" ? (
                <div className="flex items-center justify-center p-12">
                  <div className="text-center">
                    <FileText className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">Document preview not available</p>
                    <Button onClick={() => {}}>
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                </div>
              ) : (
                <img src={asset.fileUrl} alt={asset.name} className="w-full max-h-[600px] object-contain mx-auto" />
              )}

              {/* Favorite button in corner */}
              <div className="absolute top-4 right-4">
                <AssetFavoriteButton asset={asset} variant="ghost" size="icon" />
              </div>

              {/* Asset type badge */}
              <div className="absolute top-4 left-4">
                <Badge variant="secondary" className={`flex items-center gap-2 ${getAssetTypeColor(asset.type)}`}>
                  {getAssetIcon(asset.type)}
                  <span>{asset.type}</span>
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {asset.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{asset.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Usage Guidelines */}
            {usageGuideline && <UsageGuidelinesDisplay guideline={usageGuideline} />}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* File Information */}
            <Card>
              <CardHeader>
                <CardTitle>File Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Format</p>
                    <p className="text-sm font-medium">{asset.fileFormat}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">File Size</p>
                    <p className="text-sm font-medium">{asset.fileSize}</p>
                  </div>
                </div>

                {asset.dimensions && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                      <Ruler className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Dimensions</p>
                      <p className="text-sm font-medium">{asset.dimensions}</p>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Uploaded By</p>
                    <p className="text-sm font-medium">{asset.uploadedBy}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-100 text-pink-700 rounded-lg">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">{new Date(asset.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Updated</p>
                    <p className="text-sm font-medium">{new Date(asset.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Collections */}
            {collections.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    Collections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {collections.map((collection) => (
                      <div
                        key={collection.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                        <span className="text-sm font-medium">{collection.name}</span>
                        <Badge variant="secondary">{collection.assetCount}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        style={{
                          backgroundColor: tag.color + "20",
                          color: tag.color,
                          borderColor: tag.color + "40",
                        }}>
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ShowView>
  );
}
