import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, CheckSquare, FileText, TrendingUp, Mic, Square } from "lucide-react";

import { Button } from "@crm/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@crm/components/ui/dialog";
import { Card } from "@crm/components/ui/card";
import { Input } from "@crm/components/ui/input";
import { cn } from "@crm/lib/utils";
import { logEngagementEvent } from "@crm/lib/engagement";

type QuickAddKind = "task" | "quote" | "deal";

export function QuickAddDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}) {
  const navigate = useNavigate();
  const [draftTitle, setDraftTitle] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const items = useMemo(
    () =>
      [
        {
          kind: "task" as const,
          title: "Task",
          description: "Create a task and assign it",
          icon: <CheckSquare className="h-5 w-5" />,
          to: "/tasks/create",
        },
        {
          kind: "quote" as const,
          title: "Quote",
          description: "Draft and send a quote",
          icon: <FileText className="h-5 w-5" />,
          to: "/quotes/create",
        },
        {
          kind: "deal" as const,
          title: "Deal",
          description: "Add a deal to pipeline",
          icon: <TrendingUp className="h-5 w-5" />,
          to: "/deals/create",
        },
      ] satisfies Array<{ kind: QuickAddKind; title: string; description: string; icon: React.ReactNode; to: string }>,
    [],
  );

  const go = (kind: QuickAddKind, to: string, mode?: "today") => {
    logEngagementEvent("quick_add_used", { kind });
    props.onOpenChange(false);
    const titleParam = draftTitle.trim() ? `title=${encodeURIComponent(draftTitle.trim())}` : "";
    const todayParam = mode === "today" ? "for=today" : "";
    const qp = [titleParam, todayParam].filter(Boolean).join("&");
    navigate(qp ? `${to}?${qp}` : to);
  };

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0]?.transcript)
        .filter(Boolean)
        .join(" ");
      setDraftTitle(transcript);
    };

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const stopVoice = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    setListening(false);
    recognitionRef.current = null;
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className={cn("sm:max-w-xl", props.className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick add
          </DialogTitle>
          <DialogDescription>Fast capture to keep momentum</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3">
          <div className="text-sm font-medium">Quick text (optional)</div>
          <div className="text-xs text-muted-foreground">Use typing or voice-to-text; it pre-fills the create form.</div>
          <div className="mt-2 flex items-center gap-2">
            <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="e.g., Follow up with Alex about quote" />
            <Button
              type="button"
              variant={listening ? "secondary" : "outline"}
              size="icon"
              onClick={() => (listening ? stopVoice() : startVoice())}
              title={listening ? "Stop listening" : "Start voice-to-text"}
            >
              {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>
          {!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && (
            <div className="mt-2 text-xs text-muted-foreground">Voice-to-text not supported in this browser.</div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <Card key={item.kind} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-primary">{item.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{item.title}</div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Button size="sm" onClick={() => go(item.kind, item.to)}>
                      Create
                    </Button>
                    {item.kind === "task" && (
                      <Button size="sm" variant="outline" onClick={() => go(item.kind, item.to, "today")}>
                        Add for today
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
