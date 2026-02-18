import { useUpdate } from "@refinedev/core";
import { Button } from "@crm/components/ui/button";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import type { Asset } from "@crm/types";
import { useState } from "react";

interface AssetFavoriteButtonProps {
  asset: Asset;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function AssetFavoriteButton({
  asset,
  variant = "ghost",
  size = "icon",
  showLabel = false,
}: AssetFavoriteButtonProps) {
  const [isOptimistic, setIsOptimistic] = useState(asset.isFavorite);

  const { mutate: updateAsset, mutation } = useUpdate();
  const isPending = mutation.isPending;

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newFavoriteStatus = !isOptimistic;
    setIsOptimistic(newFavoriteStatus);

    updateAsset(
      {
        resource: "assets",
        id: asset.id,
        values: {
          isFavorite: newFavoriteStatus,
        },
      },
      {
        onSuccess: () => {
          toast.success(newFavoriteStatus ? "Added to favorites" : "Removed from favorites");
        },
        onError: () => {
          // Revert optimistic update on error
          setIsOptimistic(!newFavoriteStatus);
          toast.error("Failed to update favorite status");
        },
      },
    );
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      disabled={isPending}
      className={isOptimistic ? "text-red-500" : ""}>
      <Heart className={`h-4 w-4 ${isOptimistic ? "fill-red-500" : ""}`} />
      {showLabel && <span className="ml-2">{isOptimistic ? "Favorited" : "Favorite"}</span>}
    </Button>
  );
}
