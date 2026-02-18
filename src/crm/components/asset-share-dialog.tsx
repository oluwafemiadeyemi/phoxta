import { useState } from "react";
import { Button } from "@crm/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@crm/components/ui/dialog";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Share2, Copy, Check, Mail, MessageSquare } from "lucide-react";
import { Separator } from "@crm/components/ui/separator";

interface AssetShareDialogProps {
  assetName: string;
  assetUrl?: string;
  trigger?: React.ReactNode;
}

export function AssetShareDialog({ assetName, assetUrl, trigger }: AssetShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = assetUrl || window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out this asset: ${assetName}`);
    const body = encodeURIComponent(`I thought you might be interested in this asset:\n\n${assetName}\n${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleSlackShare = () => {
    // This would integrate with Slack API in a real implementation
    // For now, just copy a formatted message
    const message = `Check out this asset: *${assetName}*\n${shareUrl}`;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Asset</DialogTitle>
          <DialogDescription>Share "{assetName}" with your team or copy the link.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Copy Link Section */}
          <div className="space-y-2">
            <Label htmlFor="share-link">Asset Link</Label>
            <div className="flex gap-2">
              <Input id="share-link" value={shareUrl} readOnly className="flex-1" />
              <Button type="button" size="sm" onClick={handleCopyLink} variant={copied ? "default" : "outline"}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Share Options */}
          <div className="space-y-2">
            <Label>Share via</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleEmailShare} className="justify-start">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button variant="outline" onClick={handleSlackShare} className="justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Slack
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Share this asset with team members via email or copy a formatted message for Slack.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
