import { Button } from "@crm/components/ui/button";
import { Download } from "lucide-react";
import type { Asset } from "@crm/types";

interface AssetDownloadButtonProps {
  asset: Asset;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function AssetDownloadButton({
  asset,
  variant = "outline",
  size = "sm",
  showLabel = true,
}: AssetDownloadButtonProps) {
  const handleDownload = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

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

  return (
    <Button variant={variant} size={size} onClick={handleDownload}>
      <Download className="h-4 w-4" />
      {showLabel && <span className="ml-2">Download</span>}
    </Button>
  );
}
