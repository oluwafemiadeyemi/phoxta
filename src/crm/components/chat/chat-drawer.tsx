import { useState } from "react";
import { MessageCircle } from "lucide-react";

import ChatPage from "@crm/pages/chat";
import { Button } from "@crm/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@crm/components/ui/sheet";
import { cn } from "@crm/lib/utils";

export function ChatDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetTrigger asChild>
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "fixed z-50 shadow-lg rounded-full h-12 w-12 p-0",
            "bottom-24 right-4",
            "md:bottom-6 md:right-6",
          )}
          aria-label="Open chat"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        showOverlay={false}
        className={cn(
          "gap-0 p-0 overflow-hidden",
          "inset-y-auto top-auto bottom-4 right-4",
          "h-[72vh] max-h-[calc(100vh-6rem)]",
          "w-[420px] max-w-[calc(100vw-2rem)]",
          "rounded-xl border shadow-2xl",
          "sm:max-w-none",
        )}
      >
        <div className="sr-only">
          <SheetTitle>Chat</SheetTitle>
          <SheetDescription>Team messaging drawer</SheetDescription>
        </div>
        <div className="h-full overflow-hidden">
          <ChatPage variant="drawer" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
