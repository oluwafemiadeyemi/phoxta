import { useState, useRef, useCallback, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image,
  Type,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Minus,
  Palette,
  Code,
  Eye,
  Pen,
  LayoutTemplate,
  Undo,
  Redo,
  Square,
  Columns2,
  RectangleHorizontal,
  Footprints,
  MousePointerClick,
  FileText,
  X,
  Maximize2,
  Smartphone,
  Monitor,
} from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Badge } from "@crm/components/ui/badge";
import { Separator } from "@crm/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@crm/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@crm/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@crm/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@crm/components/ui/dialog";

/* ---------- Types ---------- */

type EditorMode = "visual" | "code" | "preview";

interface HtmlEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
}

/* ---------- Pre-built email blocks ---------- */

const EMAIL_BLOCKS = [
  {
    name: "Hero Section",
    icon: RectangleHorizontal,
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:8px;">
  <tr>
    <td style="padding:48px 32px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:0 0 12px;">Your Headline Here</h1>
      <p style="color:#e0d4f5;font-size:16px;margin:0 0 24px;max-width:480px;margin-left:auto;margin-right:auto;">Add a compelling description that explains the purpose of this email.</p>
      <a href="#" style="display:inline-block;background:#ffffff;color:#764ba2;font-weight:600;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:15px;">Get Started →</a>
    </td>
  </tr>
</table>`,
  },
  {
    name: "CTA Button",
    icon: MousePointerClick,
    html: `<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:24px 0;text-align:center;">
      <a href="#" style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:600;padding:14px 36px;border-radius:6px;text-decoration:none;font-size:15px;">Click Here</a>
    </td>
  </tr>
</table>`,
  },
  {
    name: "Image Block",
    icon: Image,
    html: `<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:16px 0;text-align:center;">
      <img src="https://placehold.co/560x280/e2e8f0/64748b?text=Your+Image" alt="Image" width="560" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:0 auto;" />
    </td>
  </tr>
</table>`,
  },
  {
    name: "Two Columns",
    icon: Columns2,
    html: `<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="48%" valign="top" style="padding-right:12px;">
            <img src="https://placehold.co/260x160/dbeafe/3b82f6?text=Left" alt="" width="260" style="max-width:100%;height:auto;border-radius:6px;display:block;" />
            <h3 style="font-size:16px;font-weight:600;margin:12px 0 6px;color:#1e293b;">Left Column</h3>
            <p style="font-size:14px;color:#64748b;margin:0;">Describe the first feature or product here.</p>
          </td>
          <td width="48%" valign="top" style="padding-left:12px;">
            <img src="https://placehold.co/260x160/fce7f3/ec4899?text=Right" alt="" width="260" style="max-width:100%;height:auto;border-radius:6px;display:block;" />
            <h3 style="font-size:16px;font-weight:600;margin:12px 0 6px;color:#1e293b;">Right Column</h3>
            <p style="font-size:14px;color:#64748b;margin:0;">Describe the second feature or product here.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
  },
  {
    name: "Divider",
    icon: Minus,
    html: `<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:24px 0;">
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" />
    </td>
  </tr>
</table>`,
  },
  {
    name: "Text Block",
    icon: Type,
    html: `<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:16px 0;">
      <p style="font-size:15px;line-height:1.6;color:#334155;margin:0;">Write your content here. You can include <a href="#" style="color:#2563eb;text-decoration:underline;">links</a>, <strong>bold text</strong>, and <em>italic text</em> to make your message engaging.</p>
    </td>
  </tr>
</table>`,
  },
  {
    name: "Order Summary",
    icon: Square,
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
  <tr>
    <td style="background:#f8fafc;padding:16px 20px;border-bottom:1px solid #e2e8f0;">
      <h3 style="font-size:16px;font-weight:600;color:#1e293b;margin:0;">Order Summary</h3>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#64748b;">Product Name</td>
          <td style="padding:8px 0;font-size:14px;color:#1e293b;text-align:right;font-weight:500;">{{amount}}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#64748b;border-top:1px solid #f1f5f9;">Shipping</td>
          <td style="padding:8px 0;font-size:14px;color:#1e293b;text-align:right;font-weight:500;border-top:1px solid #f1f5f9;">Free</td>
        </tr>
        <tr>
          <td style="padding:12px 0;font-size:15px;font-weight:600;color:#1e293b;border-top:2px solid #e2e8f0;">Total</td>
          <td style="padding:12px 0;font-size:15px;font-weight:700;color:#2563eb;text-align:right;border-top:2px solid #e2e8f0;">{{total}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
  },
  {
    name: "Footer",
    icon: Footprints,
    html: `<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:32px 0 16px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="font-size:13px;color:#94a3b8;margin:0 0 8px;">© 2026 Your Company. All rights reserved.</p>
      <p style="font-size:13px;color:#94a3b8;margin:0 0 12px;">123 Business Street, London, UK</p>
      <p style="font-size:13px;margin:0;">
        <a href="#" style="color:#64748b;text-decoration:underline;margin:0 8px;">Website</a>
        <a href="#" style="color:#64748b;text-decoration:underline;margin:0 8px;">Privacy Policy</a>
        <a href="#" style="color:#64748b;text-decoration:underline;margin:0 8px;">Unsubscribe</a>
      </p>
    </td>
  </tr>
</table>`,
  },
];

/* ---------- Starter templates ---------- */

const STARTER_TEMPLATES: { name: string; category: string; html: string }[] = [
  {
    name: "Blank",
    category: "general",
    html: "",
  },
  {
    name: "Order Confirmation",
    category: "order",
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td style="padding:32px 24px;text-align:center;background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:8px 8px 0 0;">
      <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;">Order Confirmed ✓</h1>
      <p style="color:#d1fae5;font-size:15px;margin:8px 0 0;">Thank you for your purchase, {{customerName}}!</p>
    </td>
  </tr>
  <tr>
    <td style="padding:24px;background:#ffffff;">
      <p style="font-size:15px;color:#334155;line-height:1.6;">Your order <strong>#{{orderNumber}}</strong> has been confirmed and is being processed. You'll receive a shipping notification once it's on its way.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e2e8f0;border-radius:6px;">
        <tr><td style="background:#f8fafc;padding:12px 16px;font-weight:600;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">Order Details</td></tr>
        <tr><td style="padding:12px 16px;font-size:14px;color:#475569;">Items: {{items}}</td></tr>
        <tr><td style="padding:12px 16px;font-size:14px;color:#475569;border-top:1px solid #f1f5f9;">Subtotal: {{subtotal}}</td></tr>
        <tr><td style="padding:12px 16px;font-size:15px;font-weight:600;color:#059669;border-top:1px solid #e2e8f0;">Total: {{total}}</td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="text-align:center;padding:8px 0 16px;">
        <a href="#" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">View Order →</a>
      </td></tr></table>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 24px;text-align:center;background:#f8fafc;border-radius:0 0 8px 8px;border-top:1px solid #e2e8f0;">
      <p style="font-size:13px;color:#94a3b8;margin:0;">© 2026 Your Company · <a href="#" style="color:#64748b;">Unsubscribe</a></p>
    </td>
  </tr>
</table>`,
  },
  {
    name: "Welcome Email",
    category: "general",
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td style="padding:48px 32px;text-align:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:8px 8px 0 0;">
      <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:0 0 8px;">Welcome Aboard! 🎉</h1>
      <p style="color:#e0d4f5;font-size:16px;margin:0;">We're thrilled to have you, {{customerName}}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 24px;background:#ffffff;">
      <p style="font-size:15px;color:#334155;line-height:1.7;">Thanks for signing up! Here's what you can do next:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr><td style="padding:12px 16px;background:#f0f9ff;border-radius:6px;margin-bottom:8px;"><strong style="color:#0369a1;">1.</strong> <span style="color:#334155;">Complete your profile</span></td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="padding:12px 16px;background:#f0fdf4;border-radius:6px;"><strong style="color:#15803d;">2.</strong> <span style="color:#334155;">Explore our features</span></td></tr>
        <tr><td style="height:8px;"></td></tr>
        <tr><td style="padding:12px 16px;background:#fdf4ff;border-radius:6px;"><strong style="color:#a21caf;">3.</strong> <span style="color:#334155;">Invite your team</span></td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="text-align:center;padding:16px 0;">
        <a href="#" style="display:inline-block;background:#7c3aed;color:#fff;padding:14px 36px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">Go to Dashboard →</a>
      </td></tr></table>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 24px;text-align:center;background:#f8fafc;border-radius:0 0 8px 8px;border-top:1px solid #e2e8f0;">
      <p style="font-size:13px;color:#94a3b8;margin:0;">Need help? Reply to this email or visit our <a href="#" style="color:#7c3aed;">help center</a>.</p>
    </td>
  </tr>
</table>`,
  },
  {
    name: "Support Reply",
    category: "support",
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td style="padding:24px;background:#ffffff;">
      <p style="font-size:15px;color:#334155;line-height:1.7;">Hi {{customerName}},</p>
      <p style="font-size:15px;color:#334155;line-height:1.7;">Thank you for reaching out. We've received your support request and a team member will review it shortly.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
        <tr><td style="padding:16px 20px;">
          <p style="font-size:13px;color:#64748b;margin:0 0 4px;">Ticket Reference</p>
          <p style="font-size:16px;font-weight:600;color:#1e293b;margin:0;">{{ticketNumber}}</p>
        </td></tr>
      </table>
      <p style="font-size:15px;color:#334155;line-height:1.7;">If you have additional details, simply reply to this email. Our typical response time is within 24 hours.</p>
      <p style="font-size:15px;color:#334155;line-height:1.7;margin-top:24px;">Best regards,<br/><strong>Support Team</strong></p>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 24px;text-align:center;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="font-size:13px;color:#94a3b8;margin:0;">© 2026 Your Company · <a href="#" style="color:#64748b;">Help Center</a></p>
    </td>
  </tr>
</table>`,
  },
  {
    name: "Newsletter / Marketing",
    category: "marketing",
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td style="padding:40px 32px;text-align:center;background:linear-gradient(135deg,#f472b6 0%,#ec4899 50%,#db2777 100%);border-radius:8px 8px 0 0;">
      <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 8px;">🔥 This Week's Highlights</h1>
      <p style="color:#fce7f3;font-size:15px;margin:0;">Fresh updates you don't want to miss</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 24px;background:#ffffff;">
      <img src="https://placehold.co/552x240/fce7f3/db2777?text=Featured+Story" alt="Featured" width="552" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:0 auto 20px;" />
      <h2 style="font-size:20px;color:#1e293b;margin:0 0 8px;">Featured Story Title</h2>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">A brief teaser of the most important update this week. Keep it engaging and concise to drive clicks.</p>
      <a href="#" style="color:#db2777;font-weight:600;font-size:14px;text-decoration:none;">Read More →</a>
      <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;" />
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="48%" valign="top" style="padding-right:12px;">
            <img src="https://placehold.co/252x150/dbeafe/3b82f6?text=Story+2" alt="" width="252" style="max-width:100%;height:auto;border-radius:6px;display:block;" />
            <h3 style="font-size:15px;font-weight:600;color:#1e293b;margin:10px 0 4px;">Second Article</h3>
            <p style="font-size:13px;color:#64748b;margin:0;">Short teaser text for the second story.</p>
          </td>
          <td width="48%" valign="top" style="padding-left:12px;">
            <img src="https://placehold.co/252x150/fef3c7/d97706?text=Story+3" alt="" width="252" style="max-width:100%;height:auto;border-radius:6px;display:block;" />
            <h3 style="font-size:15px;font-weight:600;color:#1e293b;margin:10px 0 4px;">Third Article</h3>
            <p style="font-size:13px;color:#64748b;margin:0;">Short teaser text for the third story.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:24px;text-align:center;background:#fdf2f8;border-radius:0 0 8px 8px;">
      <p style="font-size:13px;color:#9ca3af;margin:0 0 8px;">You're receiving this because you subscribed to our newsletter.</p>
      <a href="#" style="font-size:13px;color:#db2777;text-decoration:underline;">Unsubscribe</a>
    </td>
  </tr>
</table>`,
  },
];

/* ---------- Color palette ---------- */

const COLORS = [
  "#000000", "#374151", "#6b7280", "#9ca3af",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
  "#ffffff", "#f8fafc", "#f1f5f9", "#e2e8f0",
];

/* ---------- Toolbar button ---------- */

function ToolBtn({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={onClick}
            disabled={disabled}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ============================================================
   Main Editor Component
   ============================================================ */

export function HtmlEmailEditor({ value, onChange, className }: HtmlEmailEditorProps) {
  const [mode, setMode] = useState<EditorMode>("visual");
  const editorRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const initializedRef = useRef(false);

  /* -- Keep editable div in sync with value prop -- */
  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      editorRef.current.innerHTML = value || "";
      initializedRef.current = true;
    }
  }, [value]);

  /* -- When switching TO visual mode, load value -- */
  useEffect(() => {
    if (mode === "visual" && editorRef.current) {
      editorRef.current.innerHTML = value || "";
    }
  }, [mode]);

  /* -- Sync visual edits back to parent -- */
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  /* -- Sync code edits back to parent -- */
  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  /* -- execCommand helper -- */
  const exec = useCallback((cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  /* -- Insert HTML at cursor -- */
  const insertHtml = useCallback(
    (html: string) => {
      if (mode === "code" && codeRef.current) {
        const ta = codeRef.current;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newVal = ta.value.substring(0, start) + html + ta.value.substring(end);
        onChange(newVal);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + html.length;
          ta.focus();
        });
      } else if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand("insertHTML", false, html);
        handleInput();
      }
    },
    [mode, onChange, handleInput],
  );

  /* -- Insert link -- */
  const handleInsertLink = () => {
    if (linkUrl.trim()) {
      exec("createLink", linkUrl.trim());
      setLinkUrl("");
      setLinkPopoverOpen(false);
    }
  };

  /* -- Insert image -- */
  const handleInsertImage = () => {
    if (imageUrl.trim()) {
      insertHtml(
        `<img src="${imageUrl.trim()}" alt="Image" style="max-width:100%;height:auto;border-radius:6px;display:block;margin:8px 0;" />`,
      );
      setImageUrl("");
      setImagePopoverOpen(false);
    }
  };

  /* -- Load starter template -- */
  const loadTemplate = (html: string) => {
    onChange(html);
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
  };

  return (
    <div className={`border rounded-lg overflow-hidden bg-background flex flex-col ${className || ""}`}>
      {/* ---- Mode tabs + Starter templates ---- */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-2 py-1">
        <div className="flex items-center gap-1">
          {(
            [
              { mode: "visual" as const, label: "Visual", icon: Pen },
              { mode: "code" as const, label: "HTML", icon: Code },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.mode}
              type="button"
              variant={mode === tab.mode ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1 text-xs px-2.5"
              onClick={() => setMode(tab.mode)}
            >
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs px-2.5"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="h-3 w-3" />
            Preview
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {/* Blocks dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2.5">
                <LayoutTemplate className="h-3 w-3" />
                Blocks
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {EMAIL_BLOCKS.map((block) => (
                <DropdownMenuItem
                  key={block.name}
                  onClick={() => insertHtml(block.html)}
                  className="gap-2"
                >
                  <block.icon className="h-4 w-4 text-muted-foreground" />
                  {block.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Starter templates dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2.5">
                <FileText className="h-3 w-3" />
                Starters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {STARTER_TEMPLATES.map((tpl) => (
                <DropdownMenuItem key={tpl.name} onClick={() => loadTemplate(tpl.html)} className="gap-2">
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    {tpl.category}
                  </Badge>
                  {tpl.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ---- Formatting toolbar (visual mode) ---- */}
      {mode === "visual" && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b bg-muted/20">
          {/* Text formatting */}
          <ToolBtn icon={Bold} label="Bold" onClick={() => exec("bold")} />
          <ToolBtn icon={Italic} label="Italic" onClick={() => exec("italic")} />
          <ToolBtn icon={Underline} label="Underline" onClick={() => exec("underline")} />
          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Headings */}
          <ToolBtn icon={Heading1} label="Heading 1" onClick={() => exec("formatBlock", "h1")} />
          <ToolBtn icon={Heading2} label="Heading 2" onClick={() => exec("formatBlock", "h2")} />
          <ToolBtn icon={Type} label="Paragraph" onClick={() => exec("formatBlock", "p")} />
          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Alignment */}
          <ToolBtn icon={AlignLeft} label="Align Left" onClick={() => exec("justifyLeft")} />
          <ToolBtn icon={AlignCenter} label="Align Center" onClick={() => exec("justifyCenter")} />
          <ToolBtn icon={AlignRight} label="Align Right" onClick={() => exec("justifyRight")} />
          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Lists */}
          <ToolBtn icon={List} label="Bullet List" onClick={() => exec("insertUnorderedList")} />
          <ToolBtn icon={ListOrdered} label="Numbered List" onClick={() => exec("insertOrderedList")} />
          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Text color */}
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                <Palette className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" side="bottom" align="start">
              <p className="text-xs font-medium mb-2 text-muted-foreground">Text Color</p>
              <div className="grid grid-cols-4 gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ background: c }}
                    onClick={() => exec("foreColor", c)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Link */}
          <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                <LinkIcon className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" side="bottom" align="start">
              <Label className="text-xs">URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleInsertLink()}
                />
                <Button size="sm" className="h-8" onClick={handleInsertLink}>
                  Add
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Select text first, then add URL</p>
            </PopoverContent>
          </Popover>

          {/* Image */}
          <Popover open={imagePopoverOpen} onOpenChange={setImagePopoverOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                <Image className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" side="bottom" align="start">
              <Label className="text-xs">Image URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleInsertImage()}
                />
                <Button size="sm" className="h-8" onClick={handleInsertImage}>
                  Add
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Divider */}
          <ToolBtn icon={Minus} label="Horizontal Rule" onClick={() => exec("insertHorizontalRule")} />

          {/* Undo/Redo */}
          <ToolBtn icon={Undo} label="Undo" onClick={() => exec("undo")} />
          <ToolBtn icon={Redo} label="Redo" onClick={() => exec("redo")} />
        </div>
      )}

      {/* ---- Editor area ---- */}
      {mode === "visual" && (
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-muted/20" style={{ minHeight: "320px", touchAction: "pan-x pan-y pinch-zoom" }}>
          <div
            ref={editorRef}
            contentEditable
            className="mx-auto bg-white dark:bg-background shadow-sm p-6 focus:outline-none prose prose-sm max-w-none [&_table]:w-full [&_img]:rounded-md [&_img]:max-w-full [&_a]:text-blue-600 [&_a]:underline"
            onInput={handleInput}
            onBlur={handleInput}
            style={{
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: "15px",
              lineHeight: "1.7",
              maxWidth: "640px",
              minHeight: "100%",
              marginTop: "16px",
              marginBottom: "16px",
            }}
          />
        </div>
      )}

      {mode === "code" && (
        <textarea
          ref={codeRef}
          value={value}
          onChange={handleCodeChange}
          className="w-full flex-1 p-4 font-mono text-sm bg-slate-950 text-emerald-400 resize-none focus:outline-none"
          style={{ minHeight: "320px" }}
          spellCheck={false}
          placeholder="<!-- Write or paste your HTML email code here -->"
        />
      )}

      {/* ---- Fullscreen Preview Popup ---- */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-none w-screen h-screen p-0 m-0 border-0 rounded-none bg-gray-100 dark:bg-muted/30 flex flex-col [&>button]:hidden">
          <DialogTitle className="sr-only">Email Template Preview</DialogTitle>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Preview</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 gap-1 text-xs px-2"
                onClick={() => setPreviewDevice("mobile")}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Mobile
              </Button>
              <Button
                type="button"
                variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 gap-1 text-xs px-2"
                onClick={() => setPreviewDevice("desktop")}
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop
              </Button>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs px-2"
                onClick={() => setPreviewOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
                Close
              </Button>
            </div>
          </div>

          {/* Preview body */}
          <div className="flex-1 overflow-auto flex justify-center items-start py-6" style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
            {previewDevice === "mobile" ? (
              /* ---- Mobile phone frame ---- */
              <div
                className="relative flex flex-col bg-gray-900 rounded-[3rem] shadow-2xl border-[3px] border-gray-800"
                style={{ width: "390px", height: "calc(100vh - 120px)", maxHeight: "844px" }}
              >
                {/* Notch */}
                <div className="mx-auto mt-2 w-28 h-6 bg-gray-900 rounded-b-2xl flex items-center justify-center z-10">
                  <div className="w-16 h-4 bg-black rounded-full" />
                </div>
                {/* Screen */}
                <div className="flex-1 mx-1 mb-1 rounded-b-[2.5rem] overflow-hidden bg-white">
                  <div className="h-full overflow-auto">
                    <div
                      className="prose prose-sm max-w-none p-4 [&_table]:w-full [&_img]:rounded-md [&_img]:max-w-full [&_a]:text-blue-600 [&_a]:underline"
                      style={{
                        fontFamily: "Arial, Helvetica, sans-serif",
                        fontSize: "14px",
                        lineHeight: "1.6",
                      }}
                    >
                      {value ? (
                        <div dangerouslySetInnerHTML={{ __html: value }} />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                          <Eye className="h-8 w-8 mb-2 opacity-40" />
                          <p className="text-sm">Nothing to preview yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ---- Desktop view ---- */
              <div
                className="bg-white dark:bg-background shadow-lg rounded-lg p-6 prose prose-sm max-w-none [&_table]:w-full [&_img]:rounded-md [&_img]:max-w-full [&_a]:text-blue-600 [&_a]:underline"
                style={{
                  fontFamily: "Arial, Helvetica, sans-serif",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  width: "600px",
                  minHeight: "400px",
                }}
              >
                {value ? (
                  <div dangerouslySetInnerHTML={{ __html: value }} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                    <Eye className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-base font-medium">Nothing to preview yet.</p>
                    <p className="text-sm mt-1">Switch to Visual or HTML mode to start designing.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Footer with variable hints ---- */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-t bg-muted/20 text-[11px] text-muted-foreground">
        <span>Variables:</span>
        {["{{customerName}}", "{{orderNumber}}", "{{amount}}", "{{total}}"].map((v) => (
          <Badge
            key={v}
            variant="outline"
            className="text-[10px] cursor-pointer hover:bg-muted"
            onClick={() => insertHtml(v)}
          >
            {v}
          </Badge>
        ))}
      </div>
    </div>
  );
}
