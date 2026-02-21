"use client";

// ===========================================================================
// Website Builder — Webflow-like WYSIWYG Web Designer for Phoxta CRM
// Canvas, Styling Panel, Interactions Panel, CMS, Preview Mode
// ===========================================================================

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from "react";
import { useNavigate, useParams } from "react-router";
import { supabaseClient } from "@crm/lib/supabase";

// Supabase returns snake_case, TS types use camelCase
const snakeToCamel = (obj: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    out[camelKey] = obj[key];
  }
  return out;
};
const camelToSnake = (obj: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    out[snakeKey] = obj[key];
  }
  return out;
};
const fromDb = <T,>(rows: Record<string, unknown>[]): T[] =>
  rows.map((r) => snakeToCamel(r) as T);
const fromDbOne = <T,>(row: Record<string, unknown>): T =>
  snakeToCamel(row) as T;
const toDb = (obj: Record<string, unknown>): Record<string, unknown> =>
  camelToSnake(obj);

import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Badge } from "@crm/components/ui/badge";
import { ScrollArea } from "@crm/components/ui/scroll-area";
import { Separator } from "@crm/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@crm/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@crm/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@crm/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@crm/components/ui/tooltip";
import { Switch } from "@crm/components/ui/switch";
import { Label } from "@crm/components/ui/label";
import { Textarea } from "@crm/components/ui/textarea";
import { Slider } from "@crm/components/ui/slider";

import {
  Plus,
  Trash2,
  X,
  Loader2,
  ArrowLeft,
  Search,
  MoreVertical,
  Copy,
  Eye,
  Grid3X3,
  List,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Globe,
  Layers,
  Paintbrush,
  MousePointer2,
  Square,
  Type,
  Image as ImageIcon,
  Code,
  Columns3,
  Monitor,
  Tablet,
  Smartphone,
  Play,
  Save,
  Undo2,
  Redo2,
  Settings,
  ExternalLink,
  PanelLeftClose,
  PanelRightClose,
  Move,
  Lock,
  Unlock,
  EyeOff,
  Maximize2,
  GripVertical,
  Database,
  Zap,
  Layout,
  FileText,
  Heading,
  AlignLeft,
  Link,
  Video,
  Menu,
  Rows3,
  PanelTop,
  PanelBottom,
  Minus,
  MoveVertical,
  RectangleHorizontal,
  ListFilter,
  CheckSquare,
  Circle,
  Puzzle,
  Code2,
  LayoutList,
  ChevronsUpDown,
  GalleryHorizontal,
  Expand,
  MapPin,
  Smile,
  ClipboardList,
  TextCursor,
  AlignJustify,
  SquareStack,
  Palette,
  Upload,
  FolderOpen,
  Star,
  Clock,
  SortAsc,
  Pencil,
  RotateCcw,
  AlertCircle,
  Download,
  Share2,
  Sparkles,
  Hash,
  ArrowUp,
  ArrowDown,
  Trash,
  Frame as FrameIcon,
} from "lucide-react";
import { cn } from "@crm/lib/utils";

import type {
  WebsiteSite,
  WebsitePage,
  WebsiteElement,
  WebsiteBreakpoint,
  WebsiteGlobalStyle,
  WebsiteAsset,
  WebsiteCollection,
  WebsiteCollectionField,
  WebsiteCollectionItem,
  WebsiteInteraction,
  InteractionAction,
  ElementType,
  CSSProperties,
  ElementPaletteItem,
} from "@crm/types/website";

import {
  ELEMENT_PALETTE,
  STYLE_SECTIONS,
  FONT_OPTIONS,
  EASING_OPTIONS,
  DISPLAY_OPTIONS,
  POSITION_OPTIONS,
  FLEX_DIRECTION_OPTIONS,
  FLEX_WRAP_OPTIONS,
  JUSTIFY_OPTIONS,
  ALIGN_OPTIONS,
  TEXT_ALIGN_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  TEXT_DECORATION_OPTIONS,
  TEXT_TRANSFORM_OPTIONS,
  BORDER_STYLE_OPTIONS,
  OVERFLOW_OPTIONS,
  CURSOR_OPTIONS,
  BG_SIZE_OPTIONS,
  BG_POSITION_OPTIONS,
  BG_REPEAT_OPTIONS,
} from "@crm/types/website";

// ── Types ──
type ViewMode = "sites" | "editor";
type LeftPanel = "elements" | "pages" | "layers" | "assets" | "cms" | null;
type RightPanel = "style" | "settings" | "interactions" | null;
type Breakpoint = "desktop" | "tablet" | "mobile";

// ── Editor Context ──
interface EditorState {
  site: WebsiteSite | null;
  pages: WebsitePage[];
  currentPageId: string | null;
  elements: WebsiteElement[];
  selectedElementId: string | null;
  hoveredElementId: string | null;
  breakpoint: Breakpoint;
  zoom: number;
  isPreview: boolean;
  isDragging: boolean;
  undoStack: WebsiteElement[][];
  redoStack: WebsiteElement[][];
  leftPanel: LeftPanel;
  rightPanel: RightPanel;
  globalStyles: WebsiteGlobalStyle[];
  assets: WebsiteAsset[];
  collections: WebsiteCollection[];
  interactions: WebsiteInteraction[];
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

interface EditorContextValue extends EditorState {
  dispatch: (action: EditorAction) => void;
  selectElement: (id: string | null) => void;
  addElement: (el: Partial<WebsiteElement>, parentId?: string | null) => void;
  updateElement: (id: string, updates: Partial<WebsiteElement>) => void;
  deleteElement: (id: string) => void;
  moveElement: (id: string, direction: "up" | "down") => void;
  duplicateElement: (id: string) => void;
  saveDocument: () => Promise<void>;
  undo: () => void;
  redo: () => void;
}

type EditorAction =
  | { type: "SET_SITE"; payload: WebsiteSite }
  | { type: "SET_PAGES"; payload: WebsitePage[] }
  | { type: "SET_CURRENT_PAGE"; payload: string }
  | { type: "SET_ELEMENTS"; payload: WebsiteElement[] }
  | { type: "SET_SELECTED"; payload: string | null }
  | { type: "SET_HOVERED"; payload: string | null }
  | { type: "SET_BREAKPOINT"; payload: Breakpoint }
  | { type: "SET_ZOOM"; payload: number }
  | { type: "SET_PREVIEW"; payload: boolean }
  | { type: "SET_DRAGGING"; payload: boolean }
  | { type: "SET_LEFT_PANEL"; payload: LeftPanel }
  | { type: "SET_RIGHT_PANEL"; payload: RightPanel }
  | { type: "SET_GLOBAL_STYLES"; payload: WebsiteGlobalStyle[] }
  | { type: "SET_ASSETS"; payload: WebsiteAsset[] }
  | { type: "SET_COLLECTIONS"; payload: WebsiteCollection[] }
  | { type: "SET_INTERACTIONS"; payload: WebsiteInteraction[] }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "SET_UNSAVED"; payload: boolean };

const initialState: EditorState = {
  site: null,
  pages: [],
  currentPageId: null,
  elements: [],
  selectedElementId: null,
  hoveredElementId: null,
  breakpoint: "desktop",
  zoom: 100,
  isPreview: false,
  isDragging: false,
  undoStack: [],
  redoStack: [],
  leftPanel: "elements",
  rightPanel: "style",
  globalStyles: [],
  assets: [],
  collections: [],
  interactions: [],
  isSaving: false,
  hasUnsavedChanges: false,
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_SITE": return { ...state, site: action.payload };
    case "SET_PAGES": return { ...state, pages: action.payload };
    case "SET_CURRENT_PAGE": return { ...state, currentPageId: action.payload };
    case "SET_ELEMENTS": return { ...state, elements: action.payload, hasUnsavedChanges: true };
    case "SET_SELECTED": return { ...state, selectedElementId: action.payload };
    case "SET_HOVERED": return { ...state, hoveredElementId: action.payload };
    case "SET_BREAKPOINT": return { ...state, breakpoint: action.payload };
    case "SET_ZOOM": return { ...state, zoom: action.payload };
    case "SET_PREVIEW": return { ...state, isPreview: action.payload };
    case "SET_DRAGGING": return { ...state, isDragging: action.payload };
    case "SET_LEFT_PANEL": return { ...state, leftPanel: action.payload };
    case "SET_RIGHT_PANEL": return { ...state, rightPanel: action.payload };
    case "SET_GLOBAL_STYLES": return { ...state, globalStyles: action.payload };
    case "SET_ASSETS": return { ...state, assets: action.payload };
    case "SET_COLLECTIONS": return { ...state, collections: action.payload };
    case "SET_INTERACTIONS": return { ...state, interactions: action.payload };
    case "SET_SAVING": return { ...state, isSaving: action.payload };
    case "SET_UNSAVED": return { ...state, hasUnsavedChanges: action.payload };
    default: return state;
  }
}

const EditorContext = createContext<EditorContextValue | null>(null);

function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}

// ── Helper: build element tree ──
function buildTree(elements: WebsiteElement[]): WebsiteElement[] {
  const map = new Map<string, WebsiteElement>();
  const roots: WebsiteElement[] = [];
  elements.forEach((el) => map.set(el.id, { ...el, children: [] }));
  elements.forEach((el) => {
    const node = map.get(el.id)!;
    if (el.parentId && map.has(el.parentId)) {
      map.get(el.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  // Sort children by sortOrder
  const sortChildren = (nodes: WebsiteElement[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => n.children && sortChildren(n.children));
  };
  sortChildren(roots);
  return roots;
}

// ── Helper: generate temp ID ──
let _tempId = 0;
function tempId() {
  return `temp_${Date.now()}_${++_tempId}`;
}

// ── Icon mapping for element types ──
function getElementIcon(type: ElementType): React.ReactNode {
  const iconMap: Record<string, React.ReactNode> = {
    container: <Square className="h-3.5 w-3.5" />,
    section: <Rows3 className="h-3.5 w-3.5" />,
    heading: <Heading className="h-3.5 w-3.5" />,
    paragraph: <AlignLeft className="h-3.5 w-3.5" />,
    text_block: <Type className="h-3.5 w-3.5" />,
    rich_text: <FileText className="h-3.5 w-3.5" />,
    image: <ImageIcon className="h-3.5 w-3.5" />,
    video: <Video className="h-3.5 w-3.5" />,
    link: <Link className="h-3.5 w-3.5" />,
    button: <RectangleHorizontal className="h-3.5 w-3.5" />,
    icon: <Smile className="h-3.5 w-3.5" />,
    list: <List className="h-3.5 w-3.5" />,
    form: <ClipboardList className="h-3.5 w-3.5" />,
    input: <TextCursor className="h-3.5 w-3.5" />,
    textarea: <AlignJustify className="h-3.5 w-3.5" />,
    nav: <Menu className="h-3.5 w-3.5" />,
    navbar: <Menu className="h-3.5 w-3.5" />,
    header: <PanelTop className="h-3.5 w-3.5" />,
    footer: <PanelBottom className="h-3.5 w-3.5" />,
    hero: <Maximize2 className="h-3.5 w-3.5" />,
    grid: <Grid3X3 className="h-3.5 w-3.5" />,
    columns: <Columns3 className="h-3.5 w-3.5" />,
    divider: <Minus className="h-3.5 w-3.5" />,
    spacer: <MoveVertical className="h-3.5 w-3.5" />,
    embed: <Code className="h-3.5 w-3.5" />,
    html_embed: <Code2 className="h-3.5 w-3.5" />,
    tabs: <LayoutList className="h-3.5 w-3.5" />,
    accordion: <ChevronsUpDown className="h-3.5 w-3.5" />,
    slider: <GalleryHorizontal className="h-3.5 w-3.5" />,
    dropdown: <ChevronDown className="h-3.5 w-3.5" />,
    modal: <SquareStack className="h-3.5 w-3.5" />,
    collection_list: <Database className="h-3.5 w-3.5" />,
    symbol: <Puzzle className="h-3.5 w-3.5" />,
  };
  return iconMap[type] || <Square className="h-3.5 w-3.5" />;
}

// ===========================================================================
// PREBUILT WEBSITE TEMPLATES
// ===========================================================================

interface TemplateElementDef {
  tag: string;
  elementType: ElementType;
  textContent?: string;
  label?: string;
  src?: string;
  href?: string;
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  width?: string;
  height?: string;
  maxWidth?: string;
  minHeight?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  textAlign?: string;
  color?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  borderRadius?: string;
  gridTemplate?: string;
  position?: string;
  cursor?: string;
  children?: TemplateElementDef[];
}

interface TemplatePageDef {
  name: string;
  slug: string;
  isHomepage?: boolean;
  elements: TemplateElementDef[];
}

interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string; // emoji for now
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBg: string;
  colorText: string;
  defaultFont: string;
  pages: TemplatePageDef[];
}

const WEBSITE_TEMPLATES: WebsiteTemplate[] = [
  // ── 1. Agency / Portfolio ──
  {
    id: "agency",
    name: "Creative Agency",
    description: "Modern agency site with hero, services, portfolio grid, team section and contact form",
    category: "Business",
    thumbnail: "🏢",
    colorPrimary: "#6366f1",
    colorSecondary: "#8b5cf6",
    colorAccent: "#f59e0b",
    colorBg: "#ffffff",
    colorText: "#0f172a",
    defaultFont: "Inter",
    pages: [
      {
        name: "Home", slug: "home", isHomepage: true,
        elements: [
          { tag: "nav", elementType: "navbar", label: "Navbar", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", paddingBottom: "16px", paddingLeft: "48px", paddingRight: "48px", backgroundColor: "#ffffff", children: [
            { tag: "span", elementType: "text_block", textContent: "Acme Studio", fontWeight: "700", fontSize: "20px", label: "Logo", color: "#6366f1" },
            { tag: "div", elementType: "container", display: "flex", gap: "32px", label: "Nav Links", children: [
              { tag: "a", elementType: "link", textContent: "Home", href: "#", fontSize: "14px", fontWeight: "500" },
              { tag: "a", elementType: "link", textContent: "Services", href: "#services", fontSize: "14px", fontWeight: "500" },
              { tag: "a", elementType: "link", textContent: "Work", href: "#work", fontSize: "14px", fontWeight: "500" },
              { tag: "a", elementType: "link", textContent: "About", href: "#about", fontSize: "14px", fontWeight: "500" },
              { tag: "a", elementType: "link", textContent: "Contact", href: "#contact", fontSize: "14px", fontWeight: "500" },
            ]},
          ]},
          { tag: "section", elementType: "hero", label: "Hero", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", minHeight: "80vh", paddingLeft: "48px", paddingRight: "48px", backgroundColor: "#f8fafc", children: [
            { tag: "h1", elementType: "heading", textContent: "We Build Digital Experiences That Matter", fontSize: "56px", fontWeight: "800", lineHeight: "1.1", maxWidth: "800px", color: "#0f172a", label: "Hero Title" },
            { tag: "p", elementType: "paragraph", textContent: "A full-service creative agency helping brands stand out with strategy, design, and technology.", fontSize: "20px", color: "#64748b", marginTop: "24px", maxWidth: "600px", label: "Hero Subtitle" },
            { tag: "div", elementType: "container", display: "flex", gap: "16px", marginTop: "40px", label: "Hero CTA", children: [
              { tag: "a", elementType: "button", textContent: "View Our Work", backgroundColor: "#6366f1", color: "#ffffff", paddingTop: "14px", paddingBottom: "14px", paddingLeft: "32px", paddingRight: "32px", borderRadius: "8px", fontWeight: "600", fontSize: "16px", cursor: "pointer" },
              { tag: "a", elementType: "button", textContent: "Get in Touch", backgroundColor: "transparent", color: "#6366f1", paddingTop: "14px", paddingBottom: "14px", paddingLeft: "32px", paddingRight: "32px", borderRadius: "8px", fontWeight: "600", fontSize: "16px", cursor: "pointer" },
            ]},
          ]},
          { tag: "section", elementType: "section", label: "Services", paddingTop: "80px", paddingBottom: "80px", paddingLeft: "48px", paddingRight: "48px", children: [
            { tag: "h2", elementType: "heading", textContent: "Our Services", fontSize: "36px", fontWeight: "700", textAlign: "center", marginBottom: "48px" },
            { tag: "div", elementType: "grid", display: "grid", gridTemplate: "repeat(3, 1fr)", gap: "32px", label: "Services Grid", children: [
              { tag: "div", elementType: "container", paddingTop: "32px", paddingBottom: "32px", paddingLeft: "24px", paddingRight: "24px", backgroundColor: "#f8fafc", borderRadius: "12px", label: "Service 1", children: [
                { tag: "h3", elementType: "heading", textContent: "Brand Strategy", fontSize: "20px", fontWeight: "600", marginBottom: "12px" },
                { tag: "p", elementType: "paragraph", textContent: "We craft compelling brand narratives that connect with your audience and drive growth.", fontSize: "14px", color: "#64748b" },
              ]},
              { tag: "div", elementType: "container", paddingTop: "32px", paddingBottom: "32px", paddingLeft: "24px", paddingRight: "24px", backgroundColor: "#f8fafc", borderRadius: "12px", label: "Service 2", children: [
                { tag: "h3", elementType: "heading", textContent: "Web Design", fontSize: "20px", fontWeight: "600", marginBottom: "12px" },
                { tag: "p", elementType: "paragraph", textContent: "Beautiful, responsive websites built with modern tools and a focus on user experience.", fontSize: "14px", color: "#64748b" },
              ]},
              { tag: "div", elementType: "container", paddingTop: "32px", paddingBottom: "32px", paddingLeft: "24px", paddingRight: "24px", backgroundColor: "#f8fafc", borderRadius: "12px", label: "Service 3", children: [
                { tag: "h3", elementType: "heading", textContent: "Digital Marketing", fontSize: "20px", fontWeight: "600", marginBottom: "12px" },
                { tag: "p", elementType: "paragraph", textContent: "Data-driven campaigns that maximize your reach, engagement, and return on investment.", fontSize: "14px", color: "#64748b" },
              ]},
            ]},
          ]},
          { tag: "footer", elementType: "footer", label: "Footer", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "32px", paddingBottom: "32px", paddingLeft: "48px", paddingRight: "48px", backgroundColor: "#0f172a", children: [
            { tag: "span", elementType: "text_block", textContent: "© 2026 Acme Studio. All rights reserved.", fontSize: "14px", color: "#94a3b8" },
            { tag: "div", elementType: "container", display: "flex", gap: "24px", label: "Footer Links", children: [
              { tag: "a", elementType: "link", textContent: "Privacy", href: "#", fontSize: "14px", color: "#94a3b8" },
              { tag: "a", elementType: "link", textContent: "Terms", href: "#", fontSize: "14px", color: "#94a3b8" },
            ]},
          ]},
        ],
      },
      { name: "About", slug: "about", elements: [
        { tag: "section", elementType: "section", label: "About Hero", textAlign: "center", paddingTop: "80px", paddingBottom: "80px", paddingLeft: "48px", paddingRight: "48px", children: [
          { tag: "h1", elementType: "heading", textContent: "About Us", fontSize: "48px", fontWeight: "800" },
          { tag: "p", elementType: "paragraph", textContent: "We're a team of designers, developers, and strategists passionate about creating exceptional digital products.", fontSize: "18px", color: "#64748b", marginTop: "16px", maxWidth: "600px" },
        ]},
      ]},
      { name: "Contact", slug: "contact", elements: [
        { tag: "section", elementType: "section", label: "Contact", paddingTop: "80px", paddingBottom: "80px", paddingLeft: "48px", paddingRight: "48px", maxWidth: "640px", children: [
          { tag: "h1", elementType: "heading", textContent: "Get in Touch", fontSize: "40px", fontWeight: "700", marginBottom: "32px" },
          { tag: "form", elementType: "form", display: "flex", flexDirection: "column", gap: "20px", label: "Contact Form", children: [
            { tag: "input", elementType: "input", textContent: "", label: "Name Input" },
            { tag: "input", elementType: "input", textContent: "", label: "Email Input" },
            { tag: "textarea", elementType: "textarea", textContent: "", label: "Message" },
            { tag: "button", elementType: "button", textContent: "Send Message", backgroundColor: "#6366f1", color: "#ffffff", paddingTop: "14px", paddingBottom: "14px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" },
          ]},
        ]},
      ]},
    ],
  },

  // ── 2. SaaS Landing Page ──
  {
    id: "saas",
    name: "SaaS Landing Page",
    description: "Conversion-focused SaaS landing with features, pricing tiers, testimonials and CTA sections",
    category: "SaaS",
    thumbnail: "🚀",
    colorPrimary: "#2563eb",
    colorSecondary: "#3b82f6",
    colorAccent: "#10b981",
    colorBg: "#ffffff",
    colorText: "#1e293b",
    defaultFont: "Inter",
    pages: [
      {
        name: "Home", slug: "home", isHomepage: true,
        elements: [
          { tag: "nav", elementType: "navbar", label: "Navbar", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", paddingBottom: "16px", paddingLeft: "48px", paddingRight: "48px", children: [
            { tag: "span", elementType: "text_block", textContent: "LaunchPad", fontWeight: "700", fontSize: "22px", color: "#2563eb" },
            { tag: "div", elementType: "container", display: "flex", gap: "24px", alignItems: "center", children: [
              { tag: "a", elementType: "link", textContent: "Features", href: "#features", fontSize: "14px" },
              { tag: "a", elementType: "link", textContent: "Pricing", href: "#pricing", fontSize: "14px" },
              { tag: "a", elementType: "link", textContent: "Docs", href: "#", fontSize: "14px" },
              { tag: "a", elementType: "button", textContent: "Start Free", backgroundColor: "#2563eb", color: "#ffffff", paddingTop: "10px", paddingBottom: "10px", paddingLeft: "20px", paddingRight: "20px", borderRadius: "8px", fontWeight: "600", fontSize: "14px", cursor: "pointer" },
            ]},
          ]},
          { tag: "section", elementType: "hero", label: "Hero", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: "100px", paddingBottom: "100px", paddingLeft: "48px", paddingRight: "48px", children: [
            { tag: "div", elementType: "container", backgroundColor: "#eff6ff", paddingTop: "6px", paddingBottom: "6px", paddingLeft: "16px", paddingRight: "16px", borderRadius: "999px", marginBottom: "24px", children: [
              { tag: "span", elementType: "text_block", textContent: "✨ Now with AI-powered workflows", fontSize: "13px", color: "#2563eb", fontWeight: "500" },
            ]},
            { tag: "h1", elementType: "heading", textContent: "Ship Products Faster with LaunchPad", fontSize: "52px", fontWeight: "800", lineHeight: "1.1", maxWidth: "720px" },
            { tag: "p", elementType: "paragraph", textContent: "The all-in-one platform for modern teams to plan, build, and launch products with confidence.", fontSize: "18px", color: "#64748b", marginTop: "20px", maxWidth: "560px" },
            { tag: "div", elementType: "container", display: "flex", gap: "12px", marginTop: "36px", children: [
              { tag: "a", elementType: "button", textContent: "Get Started Free", backgroundColor: "#2563eb", color: "#ffffff", paddingTop: "14px", paddingBottom: "14px", paddingLeft: "28px", paddingRight: "28px", borderRadius: "8px", fontWeight: "600", fontSize: "16px", cursor: "pointer" },
              { tag: "a", elementType: "button", textContent: "Watch Demo →", backgroundColor: "#f1f5f9", color: "#1e293b", paddingTop: "14px", paddingBottom: "14px", paddingLeft: "28px", paddingRight: "28px", borderRadius: "8px", fontWeight: "600", fontSize: "16px", cursor: "pointer" },
            ]},
          ]},
          { tag: "section", elementType: "section", label: "Features", paddingTop: "80px", paddingBottom: "80px", paddingLeft: "48px", paddingRight: "48px", backgroundColor: "#f8fafc", children: [
            { tag: "h2", elementType: "heading", textContent: "Everything You Need", fontSize: "36px", fontWeight: "700", textAlign: "center", marginBottom: "12px" },
            { tag: "p", elementType: "paragraph", textContent: "Powerful features to streamline your workflow from idea to production.", fontSize: "16px", color: "#64748b", textAlign: "center", marginBottom: "48px" },
            { tag: "div", elementType: "grid", display: "grid", gridTemplate: "repeat(3, 1fr)", gap: "24px", children: [
              { tag: "div", elementType: "container", paddingTop: "28px", paddingBottom: "28px", paddingLeft: "24px", paddingRight: "24px", backgroundColor: "#ffffff", borderRadius: "12px", children: [
                { tag: "div", elementType: "text_block", textContent: "⚡", fontSize: "28px", marginBottom: "12px" },
                { tag: "h3", elementType: "heading", textContent: "Lightning Fast", fontSize: "18px", fontWeight: "600", marginBottom: "8px" },
                { tag: "p", elementType: "paragraph", textContent: "Deploy in seconds with our optimized build pipeline and global CDN.", fontSize: "14px", color: "#64748b" },
              ]},
              { tag: "div", elementType: "container", paddingTop: "28px", paddingBottom: "28px", paddingLeft: "24px", paddingRight: "24px", backgroundColor: "#ffffff", borderRadius: "12px", children: [
                { tag: "div", elementType: "text_block", textContent: "🔒", fontSize: "28px", marginBottom: "12px" },
                { tag: "h3", elementType: "heading", textContent: "Enterprise Security", fontSize: "18px", fontWeight: "600", marginBottom: "8px" },
                { tag: "p", elementType: "paragraph", textContent: "SOC2 compliant with end-to-end encryption and role-based access controls.", fontSize: "14px", color: "#64748b" },
              ]},
              { tag: "div", elementType: "container", paddingTop: "28px", paddingBottom: "28px", paddingLeft: "24px", paddingRight: "24px", backgroundColor: "#ffffff", borderRadius: "12px", children: [
                { tag: "div", elementType: "text_block", textContent: "📊", fontSize: "28px", marginBottom: "12px" },
                { tag: "h3", elementType: "heading", textContent: "Analytics Built-In", fontSize: "18px", fontWeight: "600", marginBottom: "8px" },
                { tag: "p", elementType: "paragraph", textContent: "Real-time dashboards and insights to measure what matters most.", fontSize: "14px", color: "#64748b" },
              ]},
            ]},
          ]},
          { tag: "section", elementType: "section", label: "Pricing", paddingTop: "80px", paddingBottom: "80px", paddingLeft: "48px", paddingRight: "48px", textAlign: "center", children: [
            { tag: "h2", elementType: "heading", textContent: "Simple, Transparent Pricing", fontSize: "36px", fontWeight: "700", marginBottom: "48px" },
            { tag: "div", elementType: "grid", display: "grid", gridTemplate: "repeat(3, 1fr)", gap: "24px", maxWidth: "960px", children: [
              { tag: "div", elementType: "container", paddingTop: "32px", paddingBottom: "32px", paddingLeft: "28px", paddingRight: "28px", backgroundColor: "#f8fafc", borderRadius: "16px", children: [
                { tag: "h3", elementType: "heading", textContent: "Starter", fontSize: "20px", fontWeight: "600", marginBottom: "8px" },
                { tag: "div", elementType: "text_block", textContent: "$0/mo", fontSize: "36px", fontWeight: "800", marginBottom: "20px", color: "#1e293b" },
                { tag: "p", elementType: "paragraph", textContent: "For individuals and small projects getting started.", fontSize: "14px", color: "#64748b", marginBottom: "24px" },
                { tag: "a", elementType: "button", textContent: "Get Started", backgroundColor: "#e2e8f0", color: "#1e293b", paddingTop: "12px", paddingBottom: "12px", paddingLeft: "24px", paddingRight: "24px", borderRadius: "8px", fontWeight: "600", width: "100%", cursor: "pointer" },
              ]},
              { tag: "div", elementType: "container", paddingTop: "32px", paddingBottom: "32px", paddingLeft: "28px", paddingRight: "28px", backgroundColor: "#2563eb", borderRadius: "16px", color: "#ffffff", children: [
                { tag: "h3", elementType: "heading", textContent: "Pro", fontSize: "20px", fontWeight: "600", marginBottom: "8px", color: "#ffffff" },
                { tag: "div", elementType: "text_block", textContent: "$29/mo", fontSize: "36px", fontWeight: "800", marginBottom: "20px", color: "#ffffff" },
                { tag: "p", elementType: "paragraph", textContent: "For growing teams that need more power and collaboration.", fontSize: "14px", color: "#bfdbfe", marginBottom: "24px" },
                { tag: "a", elementType: "button", textContent: "Start Free Trial", backgroundColor: "#ffffff", color: "#2563eb", paddingTop: "12px", paddingBottom: "12px", paddingLeft: "24px", paddingRight: "24px", borderRadius: "8px", fontWeight: "600", width: "100%", cursor: "pointer" },
              ]},
              { tag: "div", elementType: "container", paddingTop: "32px", paddingBottom: "32px", paddingLeft: "28px", paddingRight: "28px", backgroundColor: "#f8fafc", borderRadius: "16px", children: [
                { tag: "h3", elementType: "heading", textContent: "Enterprise", fontSize: "20px", fontWeight: "600", marginBottom: "8px" },
                { tag: "div", elementType: "text_block", textContent: "Custom", fontSize: "36px", fontWeight: "800", marginBottom: "20px", color: "#1e293b" },
                { tag: "p", elementType: "paragraph", textContent: "For organizations that need advanced security, compliance, and support.", fontSize: "14px", color: "#64748b", marginBottom: "24px" },
                { tag: "a", elementType: "button", textContent: "Contact Sales", backgroundColor: "#e2e8f0", color: "#1e293b", paddingTop: "12px", paddingBottom: "12px", paddingLeft: "24px", paddingRight: "24px", borderRadius: "8px", fontWeight: "600", width: "100%", cursor: "pointer" },
              ]},
            ]},
          ]},
          { tag: "footer", elementType: "footer", label: "Footer", textAlign: "center", paddingTop: "32px", paddingBottom: "32px", backgroundColor: "#f8fafc", children: [
            { tag: "span", elementType: "text_block", textContent: "© 2026 LaunchPad. Built with ❤️ for makers.", fontSize: "14px", color: "#94a3b8" },
          ]},
        ],
      },
      { name: "Pricing", slug: "pricing", elements: [
        { tag: "section", elementType: "section", paddingTop: "80px", paddingBottom: "80px", paddingLeft: "48px", paddingRight: "48px", textAlign: "center", children: [
          { tag: "h1", elementType: "heading", textContent: "Choose Your Plan", fontSize: "48px", fontWeight: "800", marginBottom: "16px" },
          { tag: "p", elementType: "paragraph", textContent: "No hidden fees. Cancel anytime.", fontSize: "18px", color: "#64748b" },
        ]},
      ]},
    ],
  },

  // ── 3. Portfolio / Personal ──
  {
    id: "portfolio",
    name: "Personal Portfolio",
    description: "Minimal portfolio for designers and developers with project showcase and bio",
    category: "Portfolio",
    thumbnail: "🎨",
    colorPrimary: "#0f172a",
    colorSecondary: "#334155",
    colorAccent: "#f97316",
    colorBg: "#ffffff",
    colorText: "#0f172a",
    defaultFont: "Inter",
    pages: [
      {
        name: "Home", slug: "home", isHomepage: true,
        elements: [
          { tag: "nav", elementType: "navbar", label: "Navbar", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "20px", paddingBottom: "20px", paddingLeft: "48px", paddingRight: "48px", children: [
            { tag: "span", elementType: "text_block", textContent: "Jane Doe", fontWeight: "700", fontSize: "18px" },
            { tag: "div", elementType: "container", display: "flex", gap: "28px", children: [
              { tag: "a", elementType: "link", textContent: "Work", href: "#work", fontSize: "14px" },
              { tag: "a", elementType: "link", textContent: "About", href: "#about", fontSize: "14px" },
              { tag: "a", elementType: "link", textContent: "Contact", href: "#contact", fontSize: "14px" },
            ]},
          ]},
          { tag: "section", elementType: "hero", label: "Hero", paddingTop: "120px", paddingBottom: "120px", paddingLeft: "48px", paddingRight: "48px", children: [
            { tag: "p", elementType: "paragraph", textContent: "Designer & Developer", fontSize: "14px", fontWeight: "500", color: "#f97316", marginBottom: "16px", textAlign: "left" },
            { tag: "h1", elementType: "heading", textContent: "I build delightful digital products that people love to use.", fontSize: "48px", fontWeight: "700", lineHeight: "1.2", maxWidth: "700px" },
            { tag: "p", elementType: "paragraph", textContent: "Based in San Francisco. Focused on interaction design, design systems, and creative coding.", fontSize: "18px", color: "#64748b", marginTop: "24px", maxWidth: "560px" },
          ]},
          { tag: "section", elementType: "section", label: "Projects", paddingTop: "60px", paddingBottom: "80px", paddingLeft: "48px", paddingRight: "48px", children: [
            { tag: "h2", elementType: "heading", textContent: "Selected Work", fontSize: "28px", fontWeight: "700", marginBottom: "40px" },
            { tag: "div", elementType: "grid", display: "grid", gridTemplate: "repeat(2, 1fr)", gap: "24px", label: "Projects Grid", children: [
              { tag: "div", elementType: "container", backgroundColor: "#f1f5f9", borderRadius: "16px", height: "320px", display: "flex", alignItems: "center", justifyContent: "center", label: "Project 1", children: [
                { tag: "span", elementType: "text_block", textContent: "Project Alpha", fontSize: "20px", fontWeight: "600", color: "#475569" },
              ]},
              { tag: "div", elementType: "container", backgroundColor: "#fef3c7", borderRadius: "16px", height: "320px", display: "flex", alignItems: "center", justifyContent: "center", label: "Project 2", children: [
                { tag: "span", elementType: "text_block", textContent: "Project Beta", fontSize: "20px", fontWeight: "600", color: "#92400e" },
              ]},
              { tag: "div", elementType: "container", backgroundColor: "#e0e7ff", borderRadius: "16px", height: "320px", display: "flex", alignItems: "center", justifyContent: "center", label: "Project 3", children: [
                { tag: "span", elementType: "text_block", textContent: "Project Gamma", fontSize: "20px", fontWeight: "600", color: "#3730a3" },
              ]},
              { tag: "div", elementType: "container", backgroundColor: "#ffe4e6", borderRadius: "16px", height: "320px", display: "flex", alignItems: "center", justifyContent: "center", label: "Project 4", children: [
                { tag: "span", elementType: "text_block", textContent: "Project Delta", fontSize: "20px", fontWeight: "600", color: "#9f1239" },
              ]},
            ]},
          ]},
          { tag: "footer", elementType: "footer", label: "Footer", textAlign: "center", paddingTop: "40px", paddingBottom: "40px", children: [
            { tag: "span", elementType: "text_block", textContent: "© 2026 Jane Doe", fontSize: "14px", color: "#94a3b8" },
          ]},
        ],
      },
    ],
  },

  // ── 4. E-commerce / Store ──
  {
    id: "ecommerce",
    name: "Online Store",
    description: "Clean e-commerce storefront with product grids, featured collections and shopping CTA",
    category: "E-commerce",
    thumbnail: "🛍️",
    colorPrimary: "#059669",
    colorSecondary: "#10b981",
    colorAccent: "#f59e0b",
    colorBg: "#ffffff",
    colorText: "#1e293b",
    defaultFont: "Inter",
    pages: [
      {
        name: "Home", slug: "home", isHomepage: true,
        elements: [
          { tag: "nav", elementType: "navbar", label: "Navbar", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", paddingBottom: "16px", paddingLeft: "48px", paddingRight: "48px", backgroundColor: "#ffffff", children: [
            { tag: "span", elementType: "text_block", textContent: "Verdant", fontWeight: "700", fontSize: "22px", color: "#059669" },
            { tag: "div", elementType: "container", display: "flex", gap: "28px", alignItems: "center", children: [
              { tag: "a", elementType: "link", textContent: "Shop", href: "#shop", fontSize: "14px", fontWeight: "500" },
              { tag: "a", elementType: "link", textContent: "Collections", href: "#collections", fontSize: "14px", fontWeight: "500" },
              { tag: "a", elementType: "link", textContent: "About", href: "#about", fontSize: "14px", fontWeight: "500" },
              { tag: "a", elementType: "button", textContent: "Cart (0)", backgroundColor: "#059669", color: "#ffffff", paddingTop: "8px", paddingBottom: "8px", paddingLeft: "16px", paddingRight: "16px", borderRadius: "8px", fontWeight: "600", fontSize: "14px", cursor: "pointer" },
            ]},
          ]},
          { tag: "section", elementType: "hero", label: "Hero Banner", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: "70vh", backgroundColor: "#ecfdf5", paddingLeft: "48px", paddingRight: "48px", children: [
            { tag: "h1", elementType: "heading", textContent: "Summer Collection 2026", fontSize: "52px", fontWeight: "800", lineHeight: "1.1", color: "#064e3b" },
            { tag: "p", elementType: "paragraph", textContent: "Discover sustainable fashion that looks good and feels even better.", fontSize: "18px", color: "#047857", marginTop: "20px", maxWidth: "500px" },
            { tag: "a", elementType: "button", textContent: "Shop Now", backgroundColor: "#059669", color: "#ffffff", paddingTop: "14px", paddingBottom: "14px", paddingLeft: "32px", paddingRight: "32px", borderRadius: "8px", fontWeight: "600", fontSize: "16px", cursor: "pointer", marginTop: "32px" },
          ]},
          { tag: "section", elementType: "section", label: "Products", paddingTop: "80px", paddingBottom: "80px", paddingLeft: "48px", paddingRight: "48px", children: [
            { tag: "h2", elementType: "heading", textContent: "Featured Products", fontSize: "32px", fontWeight: "700", textAlign: "center", marginBottom: "48px" },
            { tag: "div", elementType: "grid", display: "grid", gridTemplate: "repeat(4, 1fr)", gap: "24px", label: "Products Grid", children: [
              { tag: "div", elementType: "container", borderRadius: "12px", label: "Product 1", children: [
                { tag: "div", elementType: "container", backgroundColor: "#f1f5f9", height: "280px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", children: [
                  { tag: "span", elementType: "text_block", textContent: "📷", fontSize: "32px" },
                ]},
                { tag: "h3", elementType: "heading", textContent: "Organic Cotton Tee", fontSize: "16px", fontWeight: "600" },
                { tag: "p", elementType: "paragraph", textContent: "$48.00", fontSize: "16px", fontWeight: "700", color: "#059669", marginTop: "4px" },
              ]},
              { tag: "div", elementType: "container", borderRadius: "12px", label: "Product 2", children: [
                { tag: "div", elementType: "container", backgroundColor: "#f1f5f9", height: "280px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", children: [
                  { tag: "span", elementType: "text_block", textContent: "📷", fontSize: "32px" },
                ]},
                { tag: "h3", elementType: "heading", textContent: "Linen Blazer", fontSize: "16px", fontWeight: "600" },
                { tag: "p", elementType: "paragraph", textContent: "$128.00", fontSize: "16px", fontWeight: "700", color: "#059669", marginTop: "4px" },
              ]},
              { tag: "div", elementType: "container", borderRadius: "12px", label: "Product 3", children: [
                { tag: "div", elementType: "container", backgroundColor: "#f1f5f9", height: "280px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", children: [
                  { tag: "span", elementType: "text_block", textContent: "📷", fontSize: "32px" },
                ]},
                { tag: "h3", elementType: "heading", textContent: "Canvas Sneakers", fontSize: "16px", fontWeight: "600" },
                { tag: "p", elementType: "paragraph", textContent: "$89.00", fontSize: "16px", fontWeight: "700", color: "#059669", marginTop: "4px" },
              ]},
              { tag: "div", elementType: "container", borderRadius: "12px", label: "Product 4", children: [
                { tag: "div", elementType: "container", backgroundColor: "#f1f5f9", height: "280px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", children: [
                  { tag: "span", elementType: "text_block", textContent: "📷", fontSize: "32px" },
                ]},
                { tag: "h3", elementType: "heading", textContent: "Wool Scarf", fontSize: "16px", fontWeight: "600" },
                { tag: "p", elementType: "paragraph", textContent: "$65.00", fontSize: "16px", fontWeight: "700", color: "#059669", marginTop: "4px" },
              ]},
            ]},
          ]},
          { tag: "footer", elementType: "footer", label: "Footer", textAlign: "center", paddingTop: "32px", paddingBottom: "32px", backgroundColor: "#064e3b", children: [
            { tag: "span", elementType: "text_block", textContent: "© 2026 Verdant. Sustainable fashion for everyone.", fontSize: "14px", color: "#a7f3d0" },
          ]},
        ],
      },
      { name: "Shop", slug: "shop", elements: [
        { tag: "section", elementType: "section", paddingTop: "60px", paddingBottom: "60px", paddingLeft: "48px", paddingRight: "48px", children: [
          { tag: "h1", elementType: "heading", textContent: "All Products", fontSize: "40px", fontWeight: "700", marginBottom: "32px" },
          { tag: "div", elementType: "grid", display: "grid", gridTemplate: "repeat(3, 1fr)", gap: "24px", children: [
            { tag: "div", elementType: "container", backgroundColor: "#f1f5f9", height: "300px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", children: [
              { tag: "span", elementType: "text_block", textContent: "Product Item", fontSize: "16px", color: "#64748b" },
            ]},
          ]},
        ]},
      ]},
    ],
  },

  // ── 5. Blog / Magazine ──
  {
    id: "blog",
    name: "Blog & Magazine",
    description: "Content-focused blog with featured posts, article grid, newsletter signup and sidebar",
    category: "Blog",
    thumbnail: "📝",
    colorPrimary: "#7c3aed",
    colorSecondary: "#a78bfa",
    colorAccent: "#ec4899",
    colorBg: "#ffffff",
    colorText: "#1e293b",
    defaultFont: "Georgia",
    pages: [
      {
        name: "Home", slug: "home", isHomepage: true,
        elements: [
          { tag: "nav", elementType: "navbar", label: "Navbar", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "20px", paddingBottom: "20px", paddingLeft: "48px", paddingRight: "48px", backgroundColor: "#ffffff", children: [
            { tag: "span", elementType: "text_block", textContent: "The Dispatch", fontWeight: "700", fontSize: "24px", color: "#7c3aed" },
            { tag: "div", elementType: "container", display: "flex", gap: "28px", children: [
              { tag: "a", elementType: "link", textContent: "Latest", href: "#", fontSize: "14px" },
              { tag: "a", elementType: "link", textContent: "Technology", href: "#", fontSize: "14px" },
              { tag: "a", elementType: "link", textContent: "Design", href: "#", fontSize: "14px" },
              { tag: "a", elementType: "link", textContent: "Business", href: "#", fontSize: "14px" },
              { tag: "a", elementType: "link", textContent: "Subscribe", href: "#", fontSize: "14px", fontWeight: "600", color: "#7c3aed" },
            ]},
          ]},
          { tag: "section", elementType: "hero", label: "Featured Post", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "50vh", paddingTop: "60px", paddingBottom: "60px", paddingLeft: "48px", paddingRight: "48px", backgroundColor: "#faf5ff", children: [
            { tag: "span", elementType: "text_block", textContent: "FEATURED", fontSize: "12px", fontWeight: "600", color: "#7c3aed", marginBottom: "16px" },
            { tag: "h1", elementType: "heading", textContent: "The Future of Design in the Age of AI", fontSize: "44px", fontWeight: "700", lineHeight: "1.2", maxWidth: "700px" },
            { tag: "p", elementType: "paragraph", textContent: "How artificial intelligence is reshaping the creative landscape and what it means for designers in 2026 and beyond.", fontSize: "18px", color: "#64748b", marginTop: "16px", maxWidth: "600px" },
            { tag: "div", elementType: "container", display: "flex", gap: "12px", alignItems: "center", marginTop: "24px", children: [
              { tag: "span", elementType: "text_block", textContent: "By Sarah Chen", fontSize: "14px", fontWeight: "500" },
              { tag: "span", elementType: "text_block", textContent: "·", fontSize: "14px", color: "#94a3b8" },
              { tag: "span", elementType: "text_block", textContent: "8 min read", fontSize: "14px", color: "#94a3b8" },
            ]},
          ]},
          { tag: "section", elementType: "section", label: "Articles Grid", paddingTop: "60px", paddingBottom: "80px", paddingLeft: "48px", paddingRight: "48px", children: [
            { tag: "h2", elementType: "heading", textContent: "Latest Articles", fontSize: "28px", fontWeight: "700", marginBottom: "32px" },
            { tag: "div", elementType: "grid", display: "grid", gridTemplate: "repeat(3, 1fr)", gap: "28px", children: [
              { tag: "div", elementType: "container", label: "Article 1", children: [
                { tag: "div", elementType: "container", backgroundColor: "#f1f5f9", height: "200px", borderRadius: "12px", marginBottom: "16px" },
                { tag: "span", elementType: "text_block", textContent: "Technology", fontSize: "12px", fontWeight: "600", color: "#7c3aed", marginBottom: "8px" },
                { tag: "h3", elementType: "heading", textContent: "Why WebAssembly Will Change Frontend Development", fontSize: "18px", fontWeight: "600", lineHeight: "1.3" },
                { tag: "p", elementType: "paragraph", textContent: "A deep dive into the technology that's bringing near-native performance to the browser.", fontSize: "14px", color: "#64748b", marginTop: "8px" },
              ]},
              { tag: "div", elementType: "container", label: "Article 2", children: [
                { tag: "div", elementType: "container", backgroundColor: "#fef3c7", height: "200px", borderRadius: "12px", marginBottom: "16px" },
                { tag: "span", elementType: "text_block", textContent: "Design", fontSize: "12px", fontWeight: "600", color: "#7c3aed", marginBottom: "8px" },
                { tag: "h3", elementType: "heading", textContent: "The Return of Skeuomorphism in Modern UI", fontSize: "18px", fontWeight: "600", lineHeight: "1.3" },
                { tag: "p", elementType: "paragraph", textContent: "After years of flat design, depth and texture are making a thoughtful comeback.", fontSize: "14px", color: "#64748b", marginTop: "8px" },
              ]},
              { tag: "div", elementType: "container", label: "Article 3", children: [
                { tag: "div", elementType: "container", backgroundColor: "#e0e7ff", height: "200px", borderRadius: "12px", marginBottom: "16px" },
                { tag: "span", elementType: "text_block", textContent: "Business", fontSize: "12px", fontWeight: "600", color: "#7c3aed", marginBottom: "8px" },
                { tag: "h3", elementType: "heading", textContent: "Building a Remote-First Company Culture", fontSize: "18px", fontWeight: "600", lineHeight: "1.3" },
                { tag: "p", elementType: "paragraph", textContent: "Lessons learned from teams that thrive without a physical office.", fontSize: "14px", color: "#64748b", marginTop: "8px" },
              ]},
            ]},
          ]},
          { tag: "section", elementType: "section", label: "Newsletter", textAlign: "center", paddingTop: "60px", paddingBottom: "60px", paddingLeft: "48px", paddingRight: "48px", backgroundColor: "#faf5ff", children: [
            { tag: "h2", elementType: "heading", textContent: "Stay in the loop", fontSize: "28px", fontWeight: "700", marginBottom: "12px" },
            { tag: "p", elementType: "paragraph", textContent: "Get the best articles delivered straight to your inbox, every week.", fontSize: "16px", color: "#64748b", marginBottom: "24px" },
            { tag: "div", elementType: "container", display: "flex", gap: "12px", justifyContent: "center", children: [
              { tag: "input", elementType: "input", textContent: "", label: "Email Input", width: "320px" },
              { tag: "button", elementType: "button", textContent: "Subscribe", backgroundColor: "#7c3aed", color: "#ffffff", paddingTop: "12px", paddingBottom: "12px", paddingLeft: "24px", paddingRight: "24px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" },
            ]},
          ]},
          { tag: "footer", elementType: "footer", label: "Footer", textAlign: "center", paddingTop: "32px", paddingBottom: "32px", children: [
            { tag: "span", elementType: "text_block", textContent: "© 2026 The Dispatch. All rights reserved.", fontSize: "14px", color: "#94a3b8" },
          ]},
        ],
      },
    ],
  },

  // ── 6. Restaurant / Local Business ──
  {
    id: "restaurant",
    name: "Restaurant & Café",
    description: "Elegant restaurant site with menu sections, reservations, photo gallery and about story",
    category: "Restaurant",
    thumbnail: "🍽️",
    colorPrimary: "#b45309",
    colorSecondary: "#d97706",
    colorAccent: "#dc2626",
    colorBg: "#fffbeb",
    colorText: "#292524",
    defaultFont: "Georgia",
    pages: [
      {
        name: "Home", slug: "home", isHomepage: true,
        elements: [
          { tag: "nav", elementType: "navbar", label: "Navbar", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "20px", paddingBottom: "20px", paddingLeft: "48px", paddingRight: "48px", backgroundColor: "#fffbeb", children: [
            { tag: "span", elementType: "text_block", textContent: "La Maison", fontWeight: "700", fontSize: "24px", color: "#b45309" },
            { tag: "div", elementType: "container", display: "flex", gap: "28px", alignItems: "center", children: [
              { tag: "a", elementType: "link", textContent: "Menu", href: "#menu", fontSize: "14px", fontWeight: "500" },
              { tag: "a", elementType: "link", textContent: "Story", href: "#story", fontSize: "14px", fontWeight: "500" },
              { tag: "a", elementType: "link", textContent: "Gallery", href: "#gallery", fontSize: "14px", fontWeight: "500" },
              { tag: "a", elementType: "button", textContent: "Reserve a Table", backgroundColor: "#b45309", color: "#ffffff", paddingTop: "10px", paddingBottom: "10px", paddingLeft: "20px", paddingRight: "20px", borderRadius: "8px", fontWeight: "600", fontSize: "14px", cursor: "pointer" },
            ]},
          ]},
          { tag: "section", elementType: "hero", label: "Hero", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", minHeight: "85vh", backgroundColor: "#292524", paddingLeft: "48px", paddingRight: "48px", children: [
            { tag: "p", elementType: "paragraph", textContent: "EST. 2018", fontSize: "14px", fontWeight: "500", color: "#d97706", marginBottom: "20px" },
            { tag: "h1", elementType: "heading", textContent: "A Culinary Journey Through Flavor", fontSize: "56px", fontWeight: "700", lineHeight: "1.1", color: "#fffbeb", maxWidth: "700px" },
            { tag: "p", elementType: "paragraph", textContent: "Farm-to-table dining experience in the heart of the city, where every dish tells a story.", fontSize: "18px", color: "#a8a29e", marginTop: "24px", maxWidth: "520px" },
            { tag: "div", elementType: "container", display: "flex", gap: "16px", marginTop: "40px", children: [
              { tag: "a", elementType: "button", textContent: "View Menu", backgroundColor: "#b45309", color: "#ffffff", paddingTop: "14px", paddingBottom: "14px", paddingLeft: "32px", paddingRight: "32px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" },
              { tag: "a", elementType: "button", textContent: "Book a Table", backgroundColor: "transparent", color: "#fffbeb", paddingTop: "14px", paddingBottom: "14px", paddingLeft: "32px", paddingRight: "32px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" },
            ]},
          ]},
          { tag: "section", elementType: "section", label: "Menu Highlights", paddingTop: "80px", paddingBottom: "80px", paddingLeft: "48px", paddingRight: "48px", backgroundColor: "#fffbeb", textAlign: "center", children: [
            { tag: "p", elementType: "paragraph", textContent: "FROM OUR KITCHEN", fontSize: "13px", fontWeight: "600", color: "#b45309", marginBottom: "12px" },
            { tag: "h2", elementType: "heading", textContent: "Signature Dishes", fontSize: "36px", fontWeight: "700", marginBottom: "48px", color: "#292524" },
            { tag: "div", elementType: "grid", display: "grid", gridTemplate: "repeat(3, 1fr)", gap: "32px", children: [
              { tag: "div", elementType: "container", children: [
                { tag: "div", elementType: "container", backgroundColor: "#fef3c7", height: "240px", borderRadius: "12px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", children: [
                  { tag: "span", elementType: "text_block", textContent: "🥩", fontSize: "48px" },
                ]},
                { tag: "h3", elementType: "heading", textContent: "Wagyu Tenderloin", fontSize: "20px", fontWeight: "600", marginBottom: "8px" },
                { tag: "p", elementType: "paragraph", textContent: "With truffle jus, seasonal vegetables and potato fondant", fontSize: "14px", color: "#78716c" },
                { tag: "p", elementType: "paragraph", textContent: "$58", fontSize: "18px", fontWeight: "700", color: "#b45309", marginTop: "8px" },
              ]},
              { tag: "div", elementType: "container", children: [
                { tag: "div", elementType: "container", backgroundColor: "#fef3c7", height: "240px", borderRadius: "12px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", children: [
                  { tag: "span", elementType: "text_block", textContent: "🐟", fontSize: "48px" },
                ]},
                { tag: "h3", elementType: "heading", textContent: "Pan-Seared Salmon", fontSize: "20px", fontWeight: "600", marginBottom: "8px" },
                { tag: "p", elementType: "paragraph", textContent: "With lemon beurre blanc, asparagus, and quinoa", fontSize: "14px", color: "#78716c" },
                { tag: "p", elementType: "paragraph", textContent: "$42", fontSize: "18px", fontWeight: "700", color: "#b45309", marginTop: "8px" },
              ]},
              { tag: "div", elementType: "container", children: [
                { tag: "div", elementType: "container", backgroundColor: "#fef3c7", height: "240px", borderRadius: "12px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", children: [
                  { tag: "span", elementType: "text_block", textContent: "🍝", fontSize: "48px" },
                ]},
                { tag: "h3", elementType: "heading", textContent: "Handmade Pappardelle", fontSize: "20px", fontWeight: "600", marginBottom: "8px" },
                { tag: "p", elementType: "paragraph", textContent: "With wild mushroom ragù, parmesan, and fresh herbs", fontSize: "14px", color: "#78716c" },
                { tag: "p", elementType: "paragraph", textContent: "$36", fontSize: "18px", fontWeight: "700", color: "#b45309", marginTop: "8px" },
              ]},
            ]},
          ]},
          { tag: "section", elementType: "section", label: "Reservation CTA", textAlign: "center", paddingTop: "60px", paddingBottom: "60px", paddingLeft: "48px", paddingRight: "48px", backgroundColor: "#292524", children: [
            { tag: "h2", elementType: "heading", textContent: "Make a Reservation", fontSize: "32px", fontWeight: "700", color: "#fffbeb", marginBottom: "12px" },
            { tag: "p", elementType: "paragraph", textContent: "Join us for an unforgettable dining experience. Open Tuesday through Sunday.", fontSize: "16px", color: "#a8a29e", marginBottom: "28px" },
            { tag: "a", elementType: "button", textContent: "Book Your Table", backgroundColor: "#b45309", color: "#ffffff", paddingTop: "14px", paddingBottom: "14px", paddingLeft: "32px", paddingRight: "32px", borderRadius: "8px", fontWeight: "600", fontSize: "16px", cursor: "pointer" },
          ]},
          { tag: "footer", elementType: "footer", label: "Footer", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "32px", paddingBottom: "32px", paddingLeft: "48px", paddingRight: "48px", backgroundColor: "#1c1917", children: [
            { tag: "span", elementType: "text_block", textContent: "© 2026 La Maison. All rights reserved.", fontSize: "14px", color: "#78716c" },
            { tag: "div", elementType: "container", display: "flex", gap: "20px", children: [
              { tag: "a", elementType: "link", textContent: "Instagram", href: "#", fontSize: "14px", color: "#78716c" },
              { tag: "a", elementType: "link", textContent: "Facebook", href: "#", fontSize: "14px", color: "#78716c" },
            ]},
          ]},
        ],
      },
      { name: "Menu", slug: "menu", elements: [
        { tag: "section", elementType: "section", paddingTop: "80px", paddingBottom: "80px", paddingLeft: "48px", paddingRight: "48px", backgroundColor: "#fffbeb", textAlign: "center", children: [
          { tag: "h1", elementType: "heading", textContent: "Our Menu", fontSize: "48px", fontWeight: "700", color: "#292524", marginBottom: "16px" },
          { tag: "p", elementType: "paragraph", textContent: "Seasonally inspired, locally sourced", fontSize: "18px", color: "#78716c" },
        ]},
      ]},
      { name: "Reservations", slug: "reservations", elements: [
        { tag: "section", elementType: "section", paddingTop: "80px", paddingBottom: "80px", paddingLeft: "48px", paddingRight: "48px", maxWidth: "640px", children: [
          { tag: "h1", elementType: "heading", textContent: "Reservations", fontSize: "40px", fontWeight: "700", marginBottom: "32px" },
          { tag: "form", elementType: "form", display: "flex", flexDirection: "column", gap: "20px", label: "Reservation Form", children: [
            { tag: "input", elementType: "input", textContent: "", label: "Name" },
            { tag: "input", elementType: "input", textContent: "", label: "Date" },
            { tag: "input", elementType: "input", textContent: "", label: "Party Size" },
            { tag: "button", elementType: "button", textContent: "Request Reservation", backgroundColor: "#b45309", color: "#ffffff", paddingTop: "14px", paddingBottom: "14px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" },
          ]},
        ]},
      ]},
    ],
  },
];

// Helper: flatten a template element tree into a flat element list with parent IDs
function flattenTemplateElements(
  elements: TemplateElementDef[],
  pageId: string,
  parentId: string | null = null,
  startSort = 0,
): Partial<WebsiteElement>[] {
  const result: Partial<WebsiteElement>[] = [];
  let sortOrder = startSort;

  for (const el of elements) {
    const id = tempId();
    result.push({
      id,
      pageId,
      parentId,
      tag: el.tag,
      elementType: el.elementType,
      textContent: el.textContent || "",
      innerHTML: "",
      src: el.src || null,
      href: el.href || null,
      altText: "",
      sortOrder: sortOrder++,
      depth: 0,
      styles: {},
      responsiveStyles: {},
      stateStyles: {},
      display: el.display || null,
      position: el.position || null,
      flexDirection: el.flexDirection || null,
      flexWrap: null,
      justifyContent: el.justifyContent || null,
      alignItems: el.alignItems || null,
      gap: el.gap || null,
      gridTemplate: el.gridTemplate || null,
      width: el.width || null,
      height: el.height || null,
      minWidth: null,
      maxWidth: el.maxWidth || null,
      minHeight: el.minHeight || null,
      maxHeight: null,
      marginTop: el.marginTop || null,
      marginRight: el.marginRight || null,
      marginBottom: el.marginBottom || null,
      marginLeft: el.marginLeft || null,
      paddingTop: el.paddingTop || null,
      paddingRight: el.paddingRight || null,
      paddingBottom: el.paddingBottom || null,
      paddingLeft: el.paddingLeft || null,
      fontFamily: null,
      fontSize: el.fontSize || null,
      fontWeight: el.fontWeight || null,
      lineHeight: el.lineHeight || null,
      letterSpacing: null,
      textAlign: el.textAlign || null,
      textDecoration: null,
      textTransform: null,
      color: el.color || null,
      backgroundColor: el.backgroundColor || null,
      backgroundImage: el.backgroundImage || null,
      backgroundSize: el.backgroundSize || null,
      backgroundPosition: el.backgroundPosition || null,
      backgroundRepeat: null,
      borderWidth: null,
      borderStyle: null,
      borderColor: null,
      borderRadius: el.borderRadius || null,
      opacity: null,
      boxShadow: null,
      overflow: null,
      zIndex: null,
      cursor: el.cursor || null,
      transition: null,
      transform: null,
      filter: null,
      backdropFilter: null,
      cssClasses: [],
      customAttributes: {},
      isVisible: true,
      isLocked: false,
      label: el.label || null,
      collectionId: null,
      collectionField: null,
      symbolId: null,
      isSymbolMaster: false,
      config: {},
    });

    if (el.children?.length) {
      result.push(...flattenTemplateElements(el.children, pageId, id, 0));
    }
  }

  return result;
}

// ===========================================================================
// SITES DASHBOARD
// ===========================================================================

function SitesDashboard({ onOpenSite }: { onOpenSite: (siteId: string) => void }) {
  const [sites, setSites] = useState<WebsiteSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("My Website");
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedTemplate, setSelectedTemplate] = useState<WebsiteTemplate | null>(null);
  const [createStep, setCreateStep] = useState<"template" | "name">("template");

  const fetchSites = useCallback(async () => {
    try {
      const { data, error } = await supabaseClient
        .from("website_sites")
        .select("*")
        .order("updated_at", { ascending: false });
      if (!error && data) setSites(fromDb<WebsiteSite>(data));
    } catch { /* */ } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  const createSite = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      const slug = newName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

      // Build site insert data with template colors/fonts if selected
      const siteInsert: Record<string, unknown> = { name: newName, slug, user_id: user.id };
      if (selectedTemplate) {
        siteInsert.color_primary = selectedTemplate.colorPrimary;
        siteInsert.color_secondary = selectedTemplate.colorSecondary;
        siteInsert.color_accent = selectedTemplate.colorAccent;
        siteInsert.color_bg = selectedTemplate.colorBg;
        siteInsert.color_text = selectedTemplate.colorText;
        siteInsert.default_font = selectedTemplate.defaultFont;
        siteInsert.description = selectedTemplate.description;
      }

      const { data, error } = await supabaseClient
        .from("website_sites")
        .insert(siteInsert)
        .select()
        .single();

      if (!error && data) {
        const siteId = data.id;

        // If a template is selected, create its pages and elements
        if (selectedTemplate) {
          for (let pi = 0; pi < selectedTemplate.pages.length; pi++) {
            const tPage = selectedTemplate.pages[pi];
            const pageSlug = tPage.slug || tPage.name.toLowerCase().replace(/\s+/g, "-");
            const { data: pageData } = await supabaseClient
              .from("website_pages")
              .insert({
                site_id: siteId,
                user_id: user.id,
                name: tPage.name,
                slug: pageSlug,
                path: tPage.isHomepage ? "/" : `/${pageSlug}`,
                is_homepage: tPage.isHomepage || false,
                sort_order: pi,
              })
              .select()
              .single();

            if (pageData && tPage.elements.length > 0) {
              const flatElements = flattenTemplateElements(tPage.elements, pageData.id);
              const rows = flatElements.map((el, idx) => {
                const dbEl = toDb(el as Record<string, unknown>);
                return { ...dbEl, user_id: user.id, sort_order: idx };
              });
              await supabaseClient.from("website_elements").insert(rows);
            }
          }
        }

        setShowNewDialog(false);
        setSelectedTemplate(null);
        setCreateStep("template");
        onOpenSite(siteId);
      }
    } catch { /* */ } finally { setCreating(false); }
  };

  const deleteSite = async (id: string) => {
    try {
      await supabaseClient.from("website_sites").delete().eq("id", id);
      setSites((p) => p.filter((s) => s.id !== id));
    } catch { /* */ }
  };

  const duplicateSite = async (id: string) => {
    try {
      const { data: original } = await supabaseClient
        .from("website_sites")
        .select("*")
        .eq("id", id)
        .single();
      if (!original) return;
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      const { id: _id, created_at, updated_at, ...rest } = original;
      const { error } = await supabaseClient
        .from("website_sites")
        .insert({ ...rest, name: `${original.name} (Copy)`, slug: `${original.slug}-copy-${Date.now()}`, user_id: user.id });
      if (!error) fetchSites();
    } catch { /* */ }
  };

  const filtered = sites.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Website Builder</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Design and publish beautiful websites with a visual drag-and-drop editor
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Website
        </Button>
      </div>

      {/* Search & View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search websites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center border rounded-md">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setView("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sites Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery ? "No websites found" : "No websites yet"}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            {searchQuery
              ? "Try a different search term"
              : "Create your first website to get started"}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Website
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((site) => (
            <Card
              key={site.id}
              className="group cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onOpenSite(site.id)}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
                {site.thumbnailUrl ? (
                  <img src={site.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Globe className="h-12 w-12 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button size="sm" variant="secondary">
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">{site.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Updated {new Date(site.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant={site.status === "published" ? "default" : "secondary"}
                      className="text-[10px] px-1.5"
                    >
                      {site.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon-sm">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => onOpenSite(site.id)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateSite(site.id)}>
                          <Copy className="h-3.5 w-3.5 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        {site.publishedUrl && (
                          <DropdownMenuItem onClick={() => window.open(site.publishedUrl!, "_blank")}>
                            <ExternalLink className="h-3.5 w-3.5 mr-2" />
                            View Live
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteSite(site.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {filtered.map((site) => (
            <div
              key={site.id}
              className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer"
              onClick={() => onOpenSite(site.id)}
            >
              <div className="w-16 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                {site.thumbnailUrl ? (
                  <img src={site.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Globe className="h-5 w-5 text-muted-foreground/20" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{site.name}</p>
                <p className="text-xs text-muted-foreground">{site.slug || "No slug"}</p>
              </div>
              <Badge variant={site.status === "published" ? "default" : "secondary"}>
                {site.status}
              </Badge>
              <p className="text-xs text-muted-foreground w-28 text-right">
                {new Date(site.updatedAt).toLocaleDateString()}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon-sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => duplicateSite(site.id)}>
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => deleteSite(site.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* New Website Dialog */}
      <Dialog open={showNewDialog} onOpenChange={(open) => {
        setShowNewDialog(open);
        if (!open) { setSelectedTemplate(null); setCreateStep("template"); setNewName("My Website"); }
      }}>
        <DialogContent className={cn("max-w-2xl", createStep === "template" && "max-w-3xl")}>
          <DialogHeader>
            <DialogTitle>
              {createStep === "template" ? "Choose a Template" : "Name Your Website"}
            </DialogTitle>
            <DialogDescription>
              {createStep === "template"
                ? "Start with a prebuilt template or a blank canvas"
                : `Creating ${selectedTemplate ? `from "${selectedTemplate.name}" template` : "a blank website"}`}
            </DialogDescription>
          </DialogHeader>

          {createStep === "template" ? (
            <div className="space-y-4 py-2">
              {/* Blank option */}
              <div
                className={cn(
                  "border-2 rounded-xl p-4 cursor-pointer transition-all hover:border-primary/50",
                  !selectedTemplate ? "border-primary bg-primary/5" : "border-border"
                )}
                onClick={() => setSelectedTemplate(null)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-2xl">
                    ✨
                  </div>
                  <div>
                    <p className="font-semibold">Blank Canvas</p>
                    <p className="text-xs text-muted-foreground">Start from scratch with an empty page</p>
                  </div>
                </div>
              </div>

              {/* Template grid */}
              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                {WEBSITE_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className={cn(
                      "border-2 rounded-xl p-4 cursor-pointer transition-all hover:border-primary/50",
                      selectedTemplate?.id === tmpl.id ? "border-primary bg-primary/5" : "border-border"
                    )}
                    onClick={() => setSelectedTemplate(tmpl)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: tmpl.colorPrimary + "15" }}>
                        {tmpl.thumbnail}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{tmpl.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{tmpl.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{tmpl.category}</Badge>
                          <span className="text-[10px] text-muted-foreground">{tmpl.pages.length} page{tmpl.pages.length > 1 ? "s" : ""}</span>
                          <div className="flex gap-0.5 ml-auto">
                            {[tmpl.colorPrimary, tmpl.colorSecondary, tmpl.colorAccent].map((c, i) => (
                              <div key={i} className="w-3 h-3 rounded-full border" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Website Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My Website"
                  autoFocus
                />
              </div>
              {selectedTemplate && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xl">{selectedTemplate.thumbnail}</span>
                  <div>
                    <p className="text-sm font-medium">{selectedTemplate.name}</p>
                    <p className="text-[11px] text-muted-foreground">{selectedTemplate.pages.length} page{selectedTemplate.pages.length > 1 ? "s" : ""} will be created</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {createStep === "name" && (
              <Button variant="outline" onClick={() => setCreateStep("template")} className="mr-auto">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            {createStep === "template" ? (
              <Button onClick={() => {
                setCreateStep("name");
                if (selectedTemplate) setNewName(selectedTemplate.name);
              }}>
                Continue
                <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button onClick={createSite} disabled={creating || !newName.trim()}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Website
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===========================================================================
// LEFT PANEL: ELEMENT PALETTE (Add Elements)
// ===========================================================================

function ElementPalette() {
  const { addElement } = useEditor();
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    const cats = new Map<string, ElementPaletteItem[]>();
    ELEMENT_PALETTE.forEach((item) => {
      if (searchQuery && !item.label.toLowerCase().includes(searchQuery.toLowerCase())) return;
      if (!cats.has(item.category)) cats.set(item.category, []);
      cats.get(item.category)!.push(item);
    });
    return cats;
  }, [searchQuery]);

  const categoryLabels: Record<string, string> = {
    layout: "Layout",
    basic: "Basic",
    typography: "Typography",
    media: "Media",
    forms: "Forms",
    components: "Components",
    advanced: "Advanced",
  };

  const handleAdd = (item: ElementPaletteItem) => {
    addElement({
      tag: item.tag,
      elementType: item.type,
      label: item.label,
      textContent: item.type === "heading" ? "Heading" : item.type === "paragraph" ? "Lorem ipsum dolor sit amet, consectetur adipiscing elit." : item.type === "button" ? "Click me" : item.type === "link" ? "Link text" : "",
      display: item.defaultStyles?.display as string || null,
      position: item.defaultStyles?.position as string || null,
      styles: item.defaultStyles || {},
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {Array.from(categories.entries()).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-2 tracking-wider">
                {categoryLabels[cat] || cat}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {items.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleAdd(item)}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-md border border-transparent hover:border-border hover:bg-muted/50 transition-colors text-center"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("element-type", item.type);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                  >
                    <span className="text-muted-foreground">
                      {getElementIcon(item.type)}
                    </span>
                    <span className="text-[10px] font-medium leading-tight">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ===========================================================================
// LEFT PANEL: PAGES NAVIGATOR
// ===========================================================================

function PagesPanel() {
  const { pages, currentPageId, site, dispatch } = useEditor();
  const [showAdd, setShowAdd] = useState(false);
  const [newPageName, setNewPageName] = useState("New Page");

  const addPage = async () => {
    if (!site) return;
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      const slug = newPageName.toLowerCase().replace(/\s+/g, "-");
      const sortOrder = pages.length;
      const { data, error } = await supabaseClient
        .from("website_pages")
        .insert({ site_id: site.id, name: newPageName, slug, sort_order: sortOrder, user_id: user.id })
        .select()
        .single();
      if (!error && data) {
        const page = fromDbOne<WebsitePage>(data);
        dispatch({ type: "SET_PAGES", payload: [...pages, page] });
        dispatch({ type: "SET_CURRENT_PAGE", payload: page.id });
        setShowAdd(false);
        setNewPageName("New Page");
      }
    } catch { /* */ }
  };

  const deletePage = async (pageId: string) => {
    if (!site || pages.length <= 1) return;
    try {
      await supabaseClient.from("website_pages").delete().eq("id", pageId);
      const remaining = pages.filter((p) => p.id !== pageId);
      dispatch({ type: "SET_PAGES", payload: remaining });
      if (currentPageId === pageId && remaining.length > 0) {
        dispatch({ type: "SET_CURRENT_PAGE", payload: remaining[0].id });
      }
    } catch { /* */ }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pages</p>
        <Button variant="ghost" size="icon-sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {showAdd && (
        <div className="p-3 border-b space-y-2">
          <Input
            value={newPageName}
            onChange={(e) => setNewPageName(e.target.value)}
            placeholder="Page name"
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={addPage} className="flex-1 h-7 text-xs">Add</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {pages.map((page) => (
            <div
              key={page.id}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer text-sm group",
                page.id === currentPageId
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50"
              )}
              onClick={() => dispatch({ type: "SET_CURRENT_PAGE", payload: page.id })}
            >
              <FileText className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="flex-1 truncate text-xs">{page.name}</span>
              {page.isHomepage && (
                <Badge variant="outline" className="text-[9px] px-1 py-0">Home</Badge>
              )}
              {pages.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ===========================================================================
// LEFT PANEL: LAYERS (Element Tree)
// ===========================================================================

function LayerItem({
  element,
  depth = 0,
}: {
  element: WebsiteElement;
  depth?: number;
}) {
  const { selectedElementId, hoveredElementId, selectElement, dispatch, deleteElement, moveElement, duplicateElement } = useEditor();
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = element.children && element.children.length > 0;
  const isSelected = selectedElementId === element.id;
  const isHovered = hoveredElementId === element.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-1 py-0.5 rounded-sm cursor-pointer text-xs group",
          isSelected && "bg-primary/10 text-primary",
          isHovered && !isSelected && "bg-muted",
          "hover:bg-muted/50"
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => selectElement(element.id)}
        onMouseEnter={() => dispatch({ type: "SET_HOVERED", payload: element.id })}
        onMouseLeave={() => dispatch({ type: "SET_HOVERED", payload: null })}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="text-muted-foreground">{getElementIcon(element.elementType)}</span>
        <span className="flex-1 truncate">{element.label || element.elementType}</span>
        {!element.isVisible && <EyeOff className="h-2.5 w-2.5 text-muted-foreground" />}
        {element.isLocked && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
        <div className="hidden group-hover:flex items-center">
          <Button
            variant="ghost"
            className="h-4 w-4 p-0"
            onClick={(e) => { e.stopPropagation(); deleteElement(element.id); }}
          >
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>
      {hasChildren && !collapsed && (
        <div>
          {element.children!.map((child) => (
            <LayerItem key={child.id} element={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function LayersPanel() {
  const { elements } = useEditor();
  const tree = useMemo(() => buildTree(elements), [elements]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Layers</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1">
          {tree.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">
              No elements on this page. Add elements from the Elements panel.
            </p>
          ) : (
            tree.map((el) => <LayerItem key={el.id} element={el} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ===========================================================================
// LEFT PANEL: ASSETS
// ===========================================================================

function AssetsPanel() {
  const { assets, site } = useEditor();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !site) return;
    // In a real app, upload to Supabase Storage and create asset record
    // For now, show placeholder
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assets</p>
        <Button variant="ghost" size="icon-sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" />
        </Button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} accept="image/*,video/*,.svg,.pdf,.woff,.woff2" />
      </div>
      <ScrollArea className="flex-1">
        {assets.length === 0 ? (
          <div className="p-4 text-center">
            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No assets yet</p>
            <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3 w-3 mr-1.5" />
              Upload
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 p-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="aspect-square bg-muted rounded overflow-hidden cursor-pointer hover:ring-2 ring-primary"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("asset-url", asset.url);
                  e.dataTransfer.effectAllowed = "copy";
                }}
              >
                {asset.fileType.startsWith("image") ? (
                  <img src={asset.url} alt={asset.altText} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FileText className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ===========================================================================
// LEFT PANEL: CMS COLLECTIONS
// ===========================================================================

function CMSPanel() {
  const { collections, site, dispatch } = useEditor();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null);

  const addCollection = async () => {
    if (!site || !newName.trim()) return;
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      const slug = newName.toLowerCase().replace(/\s+/g, "-");
      const { data, error } = await supabaseClient
        .from("website_collections")
        .insert({ site_id: site.id, name: newName, slug, user_id: user.id })
        .select()
        .single();
      if (!error && data) {
        const col = fromDbOne<WebsiteCollection>(data);
        dispatch({ type: "SET_COLLECTIONS", payload: [...collections, col] });
        setShowAdd(false);
        setNewName("");
      }
    } catch { /* */ }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CMS</p>
        <Button variant="ghost" size="icon-sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {showAdd && (
        <div className="p-3 border-b space-y-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Collection name"
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={addCollection} className="flex-1 h-7 text-xs">Create</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      )}
      <ScrollArea className="flex-1">
        {collections.length === 0 ? (
          <div className="p-4 text-center">
            <Database className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground mb-1">No collections yet</p>
            <p className="text-[10px] text-muted-foreground">
              Collections let you manage dynamic content like blog posts, products, or team members
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {collections.map((col) => (
              <div key={col.id}>
                <div
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer text-xs hover:bg-muted/50",
                    expandedCollection === col.id && "bg-muted/50"
                  )}
                  onClick={() => setExpandedCollection(expandedCollection === col.id ? null : col.id)}
                >
                  <Database className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate">{col.name}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {col.fields?.length || 0} fields
                  </Badge>
                  {expandedCollection === col.id ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </div>
                {expandedCollection === col.id && (
                  <div className="ml-6 mt-1 space-y-1">
                    {col.fields?.map((f) => (
                      <div key={f.id} className="flex items-center gap-2 px-2 py-1 text-[11px] text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span>{f.name}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">{f.fieldType}</Badge>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full justify-start">
                      <Plus className="h-2.5 w-2.5 mr-1" />
                      Add Field
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ===========================================================================
// RIGHT PANEL: STYLING PANEL
// ===========================================================================

function StyleInput({
  label,
  value,
  onChange,
  type = "text",
  options,
  placeholder,
}: {
  label: string;
  value: string | number | null | undefined;
  onChange: (val: string) => void;
  type?: "text" | "color" | "select" | "number";
  options?: string[];
  placeholder?: string;
}) {
  if (type === "select" && options) {
    return (
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-muted-foreground w-20 flex-shrink-0 truncate">{label}</label>
        <Select value={value?.toString() || ""} onValueChange={onChange}>
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue placeholder={placeholder || "—"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (type === "color") {
    return (
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-muted-foreground w-20 flex-shrink-0 truncate">{label}</label>
        <div className="flex items-center gap-1.5 flex-1">
          <input
            type="color"
            value={value?.toString() || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="w-7 h-7 rounded border cursor-pointer"
          />
          <Input
            value={value?.toString() || ""}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 text-xs flex-1"
            placeholder={placeholder}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] text-muted-foreground w-20 flex-shrink-0 truncate">{label}</label>
      <Input
        type={type}
        value={value?.toString() || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 text-xs flex-1"
        placeholder={placeholder || "—"}
      />
    </div>
  );
}

function SpacingEditor({
  label,
  top,
  right,
  bottom,
  left,
  onChange,
}: {
  label: string;
  top: string | null;
  right: string | null;
  bottom: string | null;
  left: string | null;
  onChange: (side: string, val: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      <div className="grid grid-cols-4 gap-1">
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5">T</p>
          <Input
            value={top || ""}
            onChange={(e) => onChange("Top", e.target.value)}
            className="h-6 text-[10px] text-center px-1"
            placeholder="0"
          />
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5">R</p>
          <Input
            value={right || ""}
            onChange={(e) => onChange("Right", e.target.value)}
            className="h-6 text-[10px] text-center px-1"
            placeholder="0"
          />
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5">B</p>
          <Input
            value={bottom || ""}
            onChange={(e) => onChange("Bottom", e.target.value)}
            className="h-6 text-[10px] text-center px-1"
            placeholder="0"
          />
        </div>
        <div className="text-center">
          <p className="text-[9px] text-muted-foreground mb-0.5">L</p>
          <Input
            value={left || ""}
            onChange={(e) => onChange("Left", e.target.value)}
            className="h-6 text-[10px] text-center px-1"
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
}

function StylingPanel() {
  const { selectedElementId, elements, updateElement, breakpoint } = useEditor();
  const element = elements.find((e) => e.id === selectedElementId);
  const [activeSection, setActiveSection] = useState<string>("layout");

  if (!element) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <MousePointer2 className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium mb-1">No element selected</p>
        <p className="text-xs text-muted-foreground">
          Click an element on the canvas to edit its styles
        </p>
      </div>
    );
  }

  const updateStyle = (prop: string, value: string) => {
    // Compute the camelCase property name
    const updates: Partial<WebsiteElement> = {};
    (updates as Record<string, unknown>)[prop] = value || null;
    updateElement(element.id, updates);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Element info bar */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2">
          {getElementIcon(element.elementType)}
          <span className="text-xs font-medium">{element.label || element.elementType}</span>
          <Badge variant="outline" className="text-[9px] px-1 ml-auto">{element.tag}</Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Layout Section */}
          <div>
            <button
              onClick={() => setActiveSection(activeSection === "layout" ? "" : "layout")}
              className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Layout
              {activeSection === "layout" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {activeSection === "layout" && (
              <div className="mt-2 space-y-2">
                <StyleInput label="Display" value={element.display} onChange={(v) => updateStyle("display", v)} type="select" options={DISPLAY_OPTIONS} />
                <StyleInput label="Position" value={element.position} onChange={(v) => updateStyle("position", v)} type="select" options={POSITION_OPTIONS} />
                {(element.display === "flex" || element.display === "inline-flex") && (
                  <>
                    <StyleInput label="Direction" value={element.flexDirection} onChange={(v) => updateStyle("flexDirection", v)} type="select" options={FLEX_DIRECTION_OPTIONS} />
                    <StyleInput label="Wrap" value={element.flexWrap} onChange={(v) => updateStyle("flexWrap", v)} type="select" options={FLEX_WRAP_OPTIONS} />
                    <StyleInput label="Justify" value={element.justifyContent} onChange={(v) => updateStyle("justifyContent", v)} type="select" options={JUSTIFY_OPTIONS} />
                    <StyleInput label="Align" value={element.alignItems} onChange={(v) => updateStyle("alignItems", v)} type="select" options={ALIGN_OPTIONS} />
                    <StyleInput label="Gap" value={element.gap} onChange={(v) => updateStyle("gap", v)} placeholder="20px" />
                  </>
                )}
                {element.display === "grid" && (
                  <>
                    <StyleInput label="Template" value={element.gridTemplate} onChange={(v) => updateStyle("gridTemplate", v)} placeholder="repeat(3, 1fr)" />
                    <StyleInput label="Gap" value={element.gap} onChange={(v) => updateStyle("gap", v)} placeholder="20px" />
                  </>
                )}
                <StyleInput label="Overflow" value={element.overflow} onChange={(v) => updateStyle("overflow", v)} type="select" options={OVERFLOW_OPTIONS} />
              </div>
            )}
          </div>

          <Separator />

          {/* Size */}
          <div>
            <button
              onClick={() => setActiveSection(activeSection === "sizing" ? "" : "sizing")}
              className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Size
              {activeSection === "sizing" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {activeSection === "sizing" && (
              <div className="mt-2 space-y-2">
                <StyleInput label="Width" value={element.width} onChange={(v) => updateStyle("width", v)} placeholder="auto" />
                <StyleInput label="Height" value={element.height} onChange={(v) => updateStyle("height", v)} placeholder="auto" />
                <StyleInput label="Min W" value={element.minWidth} onChange={(v) => updateStyle("minWidth", v)} placeholder="auto" />
                <StyleInput label="Max W" value={element.maxWidth} onChange={(v) => updateStyle("maxWidth", v)} placeholder="none" />
                <StyleInput label="Min H" value={element.minHeight} onChange={(v) => updateStyle("minHeight", v)} placeholder="auto" />
                <StyleInput label="Max H" value={element.maxHeight} onChange={(v) => updateStyle("maxHeight", v)} placeholder="none" />
              </div>
            )}
          </div>

          <Separator />

          {/* Spacing */}
          <div>
            <button
              onClick={() => setActiveSection(activeSection === "spacing" ? "" : "spacing")}
              className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Spacing
              {activeSection === "spacing" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {activeSection === "spacing" && (
              <div className="mt-2 space-y-3">
                <SpacingEditor
                  label="Margin"
                  top={element.marginTop}
                  right={element.marginRight}
                  bottom={element.marginBottom}
                  left={element.marginLeft}
                  onChange={(side, val) => updateStyle(`margin${side}`, val)}
                />
                <SpacingEditor
                  label="Padding"
                  top={element.paddingTop}
                  right={element.paddingRight}
                  bottom={element.paddingBottom}
                  left={element.paddingLeft}
                  onChange={(side, val) => updateStyle(`padding${side}`, val)}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Typography */}
          <div>
            <button
              onClick={() => setActiveSection(activeSection === "typography" ? "" : "typography")}
              className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Typography
              {activeSection === "typography" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {activeSection === "typography" && (
              <div className="mt-2 space-y-2">
                <StyleInput label="Font" value={element.fontFamily} onChange={(v) => updateStyle("fontFamily", v)} type="select" options={FONT_OPTIONS} />
                <StyleInput label="Size" value={element.fontSize} onChange={(v) => updateStyle("fontSize", v)} placeholder="16px" />
                <StyleInput label="Weight" value={element.fontWeight} onChange={(v) => updateStyle("fontWeight", v)} type="select" options={FONT_WEIGHT_OPTIONS} />
                <StyleInput label="Height" value={element.lineHeight} onChange={(v) => updateStyle("lineHeight", v)} placeholder="1.5" />
                <StyleInput label="Spacing" value={element.letterSpacing} onChange={(v) => updateStyle("letterSpacing", v)} placeholder="0" />
                <StyleInput label="Align" value={element.textAlign} onChange={(v) => updateStyle("textAlign", v)} type="select" options={TEXT_ALIGN_OPTIONS} />
                <StyleInput label="Decoration" value={element.textDecoration} onChange={(v) => updateStyle("textDecoration", v)} type="select" options={TEXT_DECORATION_OPTIONS} />
                <StyleInput label="Transform" value={element.textTransform} onChange={(v) => updateStyle("textTransform", v)} type="select" options={TEXT_TRANSFORM_OPTIONS} />
                <StyleInput label="Color" value={element.color} onChange={(v) => updateStyle("color", v)} type="color" />
              </div>
            )}
          </div>

          <Separator />

          {/* Background */}
          <div>
            <button
              onClick={() => setActiveSection(activeSection === "background" ? "" : "background")}
              className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Backgrounds
              {activeSection === "background" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {activeSection === "background" && (
              <div className="mt-2 space-y-2">
                <StyleInput label="Color" value={element.backgroundColor} onChange={(v) => updateStyle("backgroundColor", v)} type="color" />
                <StyleInput label="Image" value={element.backgroundImage} onChange={(v) => updateStyle("backgroundImage", v)} placeholder="url(...)" />
                <StyleInput label="Size" value={element.backgroundSize} onChange={(v) => updateStyle("backgroundSize", v)} type="select" options={BG_SIZE_OPTIONS} />
                <StyleInput label="Position" value={element.backgroundPosition} onChange={(v) => updateStyle("backgroundPosition", v)} type="select" options={BG_POSITION_OPTIONS} />
                <StyleInput label="Repeat" value={element.backgroundRepeat} onChange={(v) => updateStyle("backgroundRepeat", v)} type="select" options={BG_REPEAT_OPTIONS} />
              </div>
            )}
          </div>

          <Separator />

          {/* Borders */}
          <div>
            <button
              onClick={() => setActiveSection(activeSection === "borders" ? "" : "borders")}
              className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Borders
              {activeSection === "borders" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {activeSection === "borders" && (
              <div className="mt-2 space-y-2">
                <StyleInput label="Width" value={element.borderWidth} onChange={(v) => updateStyle("borderWidth", v)} placeholder="0" />
                <StyleInput label="Style" value={element.borderStyle} onChange={(v) => updateStyle("borderStyle", v)} type="select" options={BORDER_STYLE_OPTIONS} />
                <StyleInput label="Color" value={element.borderColor} onChange={(v) => updateStyle("borderColor", v)} type="color" />
                <StyleInput label="Radius" value={element.borderRadius} onChange={(v) => updateStyle("borderRadius", v)} placeholder="0" />
              </div>
            )}
          </div>

          <Separator />

          {/* Effects */}
          <div>
            <button
              onClick={() => setActiveSection(activeSection === "effects" ? "" : "effects")}
              className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Effects
              {activeSection === "effects" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {activeSection === "effects" && (
              <div className="mt-2 space-y-2">
                <StyleInput label="Opacity" value={element.opacity} onChange={(v) => updateStyle("opacity", v)} placeholder="1" />
                <StyleInput label="Shadow" value={element.boxShadow} onChange={(v) => updateStyle("boxShadow", v)} placeholder="none" />
                <StyleInput label="Cursor" value={element.cursor} onChange={(v) => updateStyle("cursor", v)} type="select" options={CURSOR_OPTIONS} />
                <StyleInput label="Transition" value={element.transition} onChange={(v) => updateStyle("transition", v)} placeholder="all 0.3s ease" />
                <StyleInput label="Transform" value={element.transform} onChange={(v) => updateStyle("transform", v)} placeholder="none" />
                <StyleInput label="Filter" value={element.filter} onChange={(v) => updateStyle("filter", v)} placeholder="none" />
                <StyleInput label="Backdrop" value={element.backdropFilter} onChange={(v) => updateStyle("backdropFilter", v)} placeholder="none" />
                <StyleInput label="Z-Index" value={element.zIndex} onChange={(v) => updateStyle("zIndex", v)} type="number" />
              </div>
            )}
          </div>

          <Separator />

          {/* Element Settings */}
          <div>
            <button
              onClick={() => setActiveSection(activeSection === "element" ? "" : "element")}
              className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Element Settings
              {activeSection === "element" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {activeSection === "element" && (
              <div className="mt-2 space-y-2">
                <StyleInput label="Label" value={element.label} onChange={(v) => updateElement(element.id, { label: v })} placeholder="Element name" />
                <StyleInput label="Tag" value={element.tag} onChange={(v) => updateElement(element.id, { tag: v })} />
                {(element.elementType === "heading" || element.elementType === "paragraph" || element.elementType === "text_block" || element.elementType === "button" || element.elementType === "link") && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Text Content</label>
                    <Textarea
                      value={element.textContent}
                      onChange={(e) => updateElement(element.id, { textContent: e.target.value })}
                      className="text-xs"
                      rows={3}
                    />
                  </div>
                )}
                {element.elementType === "image" && (
                  <StyleInput label="Image URL" value={element.src} onChange={(v) => updateElement(element.id, { src: v })} placeholder="https://..." />
                )}
                {(element.elementType === "link" || element.elementType === "button") && (
                  <StyleInput label="Link URL" value={element.href} onChange={(v) => updateElement(element.id, { href: v })} placeholder="https://..." />
                )}
                <StyleInput label="Alt Text" value={element.altText} onChange={(v) => updateElement(element.id, { altText: v })} placeholder="Description" />
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-muted-foreground">Visible</label>
                  <Switch checked={element.isVisible} onCheckedChange={(v) => updateElement(element.id, { isVisible: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-muted-foreground">Locked</label>
                  <Switch checked={element.isLocked} onCheckedChange={(v) => updateElement(element.id, { isLocked: v })} />
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ===========================================================================
// RIGHT PANEL: INTERACTIONS (Animations)
// ===========================================================================

function InteractionsPanel() {
  const { interactions, selectedElementId, site, dispatch } = useEditor();
  const [showAdd, setShowAdd] = useState(false);
  const [newTrigger, setNewTrigger] = useState<string>("click");

  const elementInteractions = selectedElementId
    ? interactions.filter((i) => i.elementId === selectedElementId)
    : interactions;

  const triggerLabels: Record<string, string> = {
    click: "Click",
    hover: "Hover",
    scroll_into_view: "Scroll Into View",
    scroll_position: "Scroll Position",
    page_load: "Page Load",
    page_scroll: "Page Scroll",
    mouse_move: "Mouse Move",
    timed_delay: "Timed Delay",
  };

  const addInteraction = async () => {
    if (!site) return;
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      const actions = [
        {
          target: "self",
          property: "opacity",
          from: 0,
          to: 1,
          duration: 500,
          delay: 0,
          easing: "ease",
        },
      ];
      const { data, error } = await supabaseClient
        .from("website_interactions")
        .insert({
          site_id: site.id,
          element_id: selectedElementId,
          name: `${triggerLabels[newTrigger] || newTrigger} Animation`,
          trigger_type: newTrigger,
          actions,
          user_id: user.id,
        })
        .select()
        .single();
      if (!error && data) {
        const interaction = fromDbOne<WebsiteInteraction>(data);
        dispatch({ type: "SET_INTERACTIONS", payload: [...interactions, interaction] });
        setShowAdd(false);
      }
    } catch { /* */ }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interactions</p>
        <Button variant="ghost" size="icon-sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {showAdd && (
        <div className="p-3 border-b space-y-2">
          <Select value={newTrigger} onValueChange={setNewTrigger}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(triggerLabels).map(([val, label]) => (
                <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button size="sm" onClick={addInteraction} className="flex-1 h-7 text-xs">Add</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        {elementInteractions.length === 0 ? (
          <div className="p-4 text-center">
            <Zap className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground mb-1">No interactions</p>
            <p className="text-[10px] text-muted-foreground">
              Add animations triggered by scroll, click, hover, and more
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {elementInteractions.map((ix) => (
              <Card key={ix.id} className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-medium flex-1 truncate">{ix.name}</span>
                  <Switch
                    checked={ix.isActive}
                    onCheckedChange={() => {
                      /* toggle */
                    }}
                  />
                </div>
                <Badge variant="outline" className="text-[9px]">
                  {triggerLabels[ix.triggerType] || ix.triggerType}
                </Badge>
                <div className="mt-2 space-y-1">
                  {ix.actions.map((action, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
                      <span className="font-mono">{action.property}</span>
                      <span>{String(action.from)} → {String(action.to)}</span>
                      <span className="ml-auto">{action.duration}ms</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ===========================================================================
// CANVAS (WYSIWYG Editor)
// ===========================================================================

function CanvasElement({
  element,
  isPreview,
}: {
  element: WebsiteElement;
  isPreview: boolean;
}) {
  const { selectedElementId, hoveredElementId, selectElement, dispatch } = useEditor();
  const isSelected = selectedElementId === element.id;
  const isHovered = hoveredElementId === element.id;

  const computedStyle: React.CSSProperties = {
    display: element.display || undefined,
    position: element.position as React.CSSProperties["position"] || undefined,
    flexDirection: element.flexDirection as React.CSSProperties["flexDirection"] || undefined,
    flexWrap: element.flexWrap as React.CSSProperties["flexWrap"] || undefined,
    justifyContent: element.justifyContent || undefined,
    alignItems: element.alignItems || undefined,
    gap: element.gap || undefined,
    gridTemplateColumns: element.display === "grid" ? (element.gridTemplate || undefined) : undefined,
    width: element.width || undefined,
    height: element.height || undefined,
    minWidth: element.minWidth || undefined,
    maxWidth: element.maxWidth || undefined,
    minHeight: element.minHeight || undefined,
    maxHeight: element.maxHeight || undefined,
    marginTop: element.marginTop || undefined,
    marginRight: element.marginRight || undefined,
    marginBottom: element.marginBottom || undefined,
    marginLeft: element.marginLeft || undefined,
    paddingTop: element.paddingTop || undefined,
    paddingRight: element.paddingRight || undefined,
    paddingBottom: element.paddingBottom || undefined,
    paddingLeft: element.paddingLeft || undefined,
    fontFamily: element.fontFamily || undefined,
    fontSize: element.fontSize || undefined,
    fontWeight: element.fontWeight || undefined,
    lineHeight: element.lineHeight || undefined,
    letterSpacing: element.letterSpacing || undefined,
    textAlign: element.textAlign as React.CSSProperties["textAlign"] || undefined,
    textDecoration: element.textDecoration || undefined,
    textTransform: element.textTransform as React.CSSProperties["textTransform"] || undefined,
    color: element.color || undefined,
    backgroundColor: element.backgroundColor || undefined,
    backgroundImage: element.backgroundImage || undefined,
    backgroundSize: element.backgroundSize || undefined,
    backgroundPosition: element.backgroundPosition || undefined,
    backgroundRepeat: element.backgroundRepeat || undefined,
    borderWidth: element.borderWidth || undefined,
    borderStyle: element.borderStyle as React.CSSProperties["borderStyle"] || undefined,
    borderColor: element.borderColor || undefined,
    borderRadius: element.borderRadius || undefined,
    opacity: element.opacity ? Number(element.opacity) : undefined,
    boxShadow: element.boxShadow || undefined,
    overflow: element.overflow as React.CSSProperties["overflow"] || undefined,
    zIndex: element.zIndex ?? undefined,
    cursor: element.cursor || undefined,
    transition: element.transition || undefined,
    transform: element.transform || undefined,
    filter: element.filter || undefined,
    backdropFilter: element.backdropFilter || undefined,
    // Apply inline styles from .styles JSONB
    ...Object.entries(element.styles || {}).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null && v !== "") (acc as Record<string, unknown>)[k] = v;
      return acc;
    }, {} as React.CSSProperties),
  };

  // Determine if element is self-closing
  const isSelfClosing = ["img", "hr", "br", "input"].includes(element.tag);

  const handleClick = (e: React.MouseEvent) => {
    if (isPreview) return;
    e.stopPropagation();
    selectElement(element.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: "SET_HOVERED", payload: element.id });
  };

  if (!element.isVisible && !isPreview) {
    computedStyle.opacity = 0.3;
  }

  const outlineClasses = !isPreview
    ? cn(
        "relative",
        isSelected && "outline-2 outline outline-primary outline-offset-1",
        isHovered && !isSelected && "outline-1 outline outline-primary/40 outline-offset-1"
      )
    : "";

  const content = element.textContent || (element.innerHTML ? undefined : undefined);

  if (isSelfClosing) {
    if (element.tag === "img") {
      return (
        <img
          src={element.src || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23e2e8f0' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='14' fill='%2394a3b8'%3EImage%3C/text%3E%3C/svg%3E"}
          alt={element.altText}
          style={computedStyle}
          className={outlineClasses}
          onClick={handleClick}
          onMouseEnter={() => !isPreview && dispatch({ type: "SET_HOVERED", payload: element.id })}
          onMouseLeave={() => !isPreview && dispatch({ type: "SET_HOVERED", payload: null })}
          onDragOver={handleDragOver}
          draggable={false}
        />
      );
    }
    if (element.tag === "hr") {
      return (
        <hr
          style={computedStyle}
          className={outlineClasses}
          onClick={handleClick}
          onMouseEnter={() => !isPreview && dispatch({ type: "SET_HOVERED", payload: element.id })}
          onMouseLeave={() => !isPreview && dispatch({ type: "SET_HOVERED", payload: null })}
        />
      );
    }
    if (element.tag === "input") {
      return (
        <input
          type="text"
          placeholder="Input field"
          style={computedStyle}
          className={outlineClasses}
          onClick={handleClick}
          onMouseEnter={() => !isPreview && dispatch({ type: "SET_HOVERED", payload: element.id })}
          onMouseLeave={() => !isPreview && dispatch({ type: "SET_HOVERED", payload: null })}
          readOnly={!isPreview}
        />
      );
    }
    return null;
  }

  const Tag = element.tag as keyof React.JSX.IntrinsicElements;

  return (
    <Tag
      style={computedStyle}
      className={cn(outlineClasses, !isPreview && !content && (!element.children || element.children.length === 0) && "min-h-10")}
      onClick={handleClick}
      onMouseEnter={() => !isPreview && dispatch({ type: "SET_HOVERED", payload: element.id })}
      onMouseLeave={() => !isPreview && dispatch({ type: "SET_HOVERED", payload: null })}
      onDragOver={handleDragOver}
      onDrop={(e: React.DragEvent) => {
        if (isPreview) return;
        e.preventDefault();
        e.stopPropagation();
        const elType = e.dataTransfer.getData("element-type");
        if (elType) {
          const paletteItem = ELEMENT_PALETTE.find((p) => p.type === elType);
          if (paletteItem) {
            const { addElement } = useEditor(); // handled via context in parent
          }
        }
      }}
    >
      {content}
      {element.innerHTML && (
        <span dangerouslySetInnerHTML={{ __html: element.innerHTML }} />
      )}
      {element.children?.map((child) => (
        <CanvasElement key={child.id} element={child} isPreview={isPreview} />
      ))}
      {/* Empty container indicator */}
      {!isPreview && !content && !element.innerHTML && (!element.children || element.children.length === 0) && (
        <div className="flex items-center justify-center h-full min-h-10 border-dashed border-2 border-muted-foreground/20 rounded text-muted-foreground/40 text-xs">
          + {element.label || element.elementType}
        </div>
      )}
    </Tag>
  );
}

function Canvas() {
  const { elements, isPreview, breakpoint, zoom, selectedElementId, selectElement, dispatch, addElement } = useEditor();
  const tree = useMemo(() => buildTree(elements), [elements]);

  const canvasWidth = breakpoint === "desktop" ? "100%" : breakpoint === "tablet" ? "768px" : "375px";

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectElement(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const elType = e.dataTransfer.getData("element-type") as ElementType;
    if (elType) {
      const paletteItem = ELEMENT_PALETTE.find((p) => p.type === elType);
      if (paletteItem) {
        addElement({
          tag: paletteItem.tag,
          elementType: paletteItem.type,
          label: paletteItem.label,
          textContent: paletteItem.type === "heading" ? "Heading" : paletteItem.type === "paragraph" ? "Lorem ipsum dolor sit amet." : paletteItem.type === "button" ? "Click me" : "",
          styles: paletteItem.defaultStyles || {},
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  return (
    <div
      className="flex-1 overflow-auto bg-muted/30"
      onClick={handleCanvasClick}
    >
      <div className="flex items-start justify-center p-8 min-h-full">
        <div
          className={cn(
            "bg-white shadow-lg transition-all duration-200 min-h-[600px]",
            !isPreview && "ring-1 ring-border"
          )}
          style={{
            width: canvasWidth,
            maxWidth: "100%",
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-muted-foreground/50">
              <Layout className="h-12 w-12 mb-4" />
              <p className="text-sm font-medium mb-1">Empty Page</p>
              <p className="text-xs">Drag elements from the left panel or click to add</p>
            </div>
          ) : (
            tree.map((el) => (
              <CanvasElement key={el.id} element={el} isPreview={isPreview} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// PREVIEW MODE
// ===========================================================================

function PreviewBar() {
  const { isPreview, breakpoint, dispatch } = useEditor();

  if (!isPreview) return null;

  return (
    <div className="bg-zinc-900 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-green-400" />
        <span className="text-sm font-medium">Preview Mode</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("text-white hover:bg-white/10", breakpoint === "desktop" && "bg-white/20")}
          onClick={() => dispatch({ type: "SET_BREAKPOINT", payload: "desktop" })}
        >
          <Monitor className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("text-white hover:bg-white/10", breakpoint === "tablet" && "bg-white/20")}
          onClick={() => dispatch({ type: "SET_BREAKPOINT", payload: "tablet" })}
        >
          <Tablet className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("text-white hover:bg-white/10", breakpoint === "mobile" && "bg-white/20")}
          onClick={() => dispatch({ type: "SET_BREAKPOINT", payload: "mobile" })}
        >
          <Smartphone className="h-4 w-4" />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:bg-white/10"
        onClick={() => dispatch({ type: "SET_PREVIEW", payload: false })}
      >
        <X className="h-4 w-4 mr-1.5" />
        Exit Preview
      </Button>
    </div>
  );
}

// ===========================================================================
// TOP BAR
// ===========================================================================

function TopBar({ onBack }: { onBack: () => void }) {
  const {
    site, pages, currentPageId, breakpoint, zoom, isPreview,
    hasUnsavedChanges, isSaving,
    dispatch, saveDocument, undo, redo,
  } = useEditor();

  const currentPage = pages.find((p) => p.id === currentPageId);

  return (
    <div className="h-12 bg-background border-b flex items-center px-3 gap-2">
      {/* Left: Back + Site Name */}
      <Button variant="ghost" size="icon-sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <div className="flex items-center gap-1.5 min-w-0">
        <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-medium truncate max-w-[120px]">{site?.name || "Website"}</span>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm text-muted-foreground truncate max-w-[100px]">
          {currentPage?.name || "Page"}
        </span>
      </div>

      {/* Center: Page selector + breakpoint */}
      <div className="flex-1 flex items-center justify-center gap-2">
        {/* Breakpoints */}
        <div className="flex items-center border rounded-md">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={breakpoint === "desktop" ? "secondary" : "ghost"}
                  size="icon-sm"
                  onClick={() => dispatch({ type: "SET_BREAKPOINT", payload: "desktop" })}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desktop (≥1280px)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={breakpoint === "tablet" ? "secondary" : "ghost"}
                  size="icon-sm"
                  onClick={() => dispatch({ type: "SET_BREAKPOINT", payload: "tablet" })}
                >
                  <Tablet className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tablet (768px–1279px)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={breakpoint === "mobile" ? "secondary" : "ghost"}
                  size="icon-sm"
                  onClick={() => dispatch({ type: "SET_BREAKPOINT", payload: "mobile" })}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mobile (≤479px)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Zoom */}
        <Select
          value={zoom.toString()}
          onValueChange={(v) => dispatch({ type: "SET_ZOOM", payload: Number(v) })}
        >
          <SelectTrigger className="w-20 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[50, 75, 100, 125, 150, 200].map((z) => (
              <SelectItem key={z} value={z.toString()} className="text-xs">{z}%</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={undo}>
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={redo}>
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => dispatch({ type: "SET_PREVIEW", payload: !isPreview })}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          Preview
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={saveDocument}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1.5" />
          )}
          Save
          {hasUnsavedChanges && <span className="ml-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />}
        </Button>

        <Button size="sm" className="text-xs">
          <Globe className="h-3.5 w-3.5 mr-1.5" />
          Publish
        </Button>
      </div>
    </div>
  );
}

// ===========================================================================
// LEFT TOOLBAR (icon tabs)
// ===========================================================================

function LeftToolbar() {
  const { leftPanel, dispatch } = useEditor();

  const tabs: { id: LeftPanel; icon: React.ReactNode; label: string }[] = [
    { id: "elements", icon: <Plus className="h-4 w-4" />, label: "Add" },
    { id: "pages", icon: <FileText className="h-4 w-4" />, label: "Pages" },
    { id: "layers", icon: <Layers className="h-4 w-4" />, label: "Layers" },
    { id: "assets", icon: <ImageIcon className="h-4 w-4" />, label: "Assets" },
    { id: "cms", icon: <Database className="h-4 w-4" />, label: "CMS" },
  ];

  return (
    <div className="w-12 bg-background border-r flex flex-col items-center py-2 gap-1">
      {tabs.map((tab) => (
        <TooltipProvider key={tab.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={leftPanel === tab.id ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() =>
                  dispatch({
                    type: "SET_LEFT_PANEL",
                    payload: leftPanel === tab.id ? null : tab.id,
                  })
                }
              >
                {tab.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{tab.label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}

// ===========================================================================
// RIGHT TOOLBAR (icon tabs)
// ===========================================================================

function RightToolbar() {
  const { rightPanel, dispatch } = useEditor();

  const tabs: { id: RightPanel; icon: React.ReactNode; label: string }[] = [
    { id: "style", icon: <Paintbrush className="h-4 w-4" />, label: "Style" },
    { id: "settings", icon: <Settings className="h-4 w-4" />, label: "Settings" },
    { id: "interactions", icon: <Zap className="h-4 w-4" />, label: "Interactions" },
  ];

  return (
    <div className="w-12 bg-background border-l flex flex-col items-center py-2 gap-1">
      {tabs.map((tab) => (
        <TooltipProvider key={tab.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={rightPanel === tab.id ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() =>
                  dispatch({
                    type: "SET_RIGHT_PANEL",
                    payload: rightPanel === tab.id ? null : tab.id,
                  })
                }
              >
                {tab.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{tab.label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}

// ===========================================================================
// SITE SETTINGS (right panel)
// ===========================================================================

function SiteSettingsPanel() {
  const { site, dispatch } = useEditor();

  if (!site) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Site Settings</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Site Name</Label>
            <Input value={site.name} className="h-8 text-xs" readOnly />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Slug</Label>
            <Input value={site.slug} className="h-8 text-xs" readOnly />
          </div>
          <Separator />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Colors</p>
            <div className="space-y-2">
              <StyleInput label="Primary" value={site.colorPrimary} onChange={() => {}} type="color" />
              <StyleInput label="Secondary" value={site.colorSecondary} onChange={() => {}} type="color" />
              <StyleInput label="Accent" value={site.colorAccent} onChange={() => {}} type="color" />
              <StyleInput label="Background" value={site.colorBg} onChange={() => {}} type="color" />
              <StyleInput label="Text" value={site.colorText} onChange={() => {}} type="color" />
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Typography</p>
            <StyleInput label="Default Font" value={site.defaultFont} onChange={() => {}} type="select" options={FONT_OPTIONS} />
          </div>
          <Separator />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Custom Code</p>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Head Code</Label>
                <Textarea value={site.customHead} className="text-xs font-mono" rows={3} readOnly />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Body End Code</Label>
                <Textarea value={site.customBodyEnd} className="text-xs font-mono" rows={3} readOnly />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ===========================================================================
// EDITOR (assembled)
// ===========================================================================

function WebsiteEditor({ siteId, onBack }: { siteId: string; onBack: () => void }) {
  const [state, dispatchRaw] = React.useReducer(editorReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const dispatch = useCallback((action: EditorAction) => dispatchRaw(action), []);

  // Load site data
  useEffect(() => {
    const load = async () => {
      try {
        const [siteResult, pagesResult] = await Promise.all([
          supabaseClient.from("website_sites").select("*").eq("id", siteId).single(),
          supabaseClient.from("website_pages").select("*").eq("site_id", siteId).order("sort_order"),
        ]);

        if (siteResult.error || !siteResult.data) {
          setLoadError("Failed to load website");
          return;
        }

        const siteData = fromDbOne<WebsiteSite>(siteResult.data);
        const pagesData = pagesResult.data ? fromDb<WebsitePage>(pagesResult.data) : [];

        dispatch({ type: "SET_SITE", payload: siteData });
        dispatch({ type: "SET_PAGES", payload: pagesData });

        // Set current page to homepage or first page
        const homepage = pagesData.find((p: WebsitePage) => p.isHomepage);
        const firstPage = pagesData[0];
        if (homepage || firstPage) {
          dispatch({ type: "SET_CURRENT_PAGE", payload: (homepage || firstPage).id });
        }

        // Load collections (with nested fields)
        supabaseClient
          .from("website_collections")
          .select("*")
          .eq("site_id", siteId)
          .then(({ data }) => {
            dispatch({ type: "SET_COLLECTIONS", payload: data ? fromDb<WebsiteCollection>(data) : [] });
          });

        // Load interactions
        supabaseClient
          .from("website_interactions")
          .select("*")
          .eq("site_id", siteId)
          .then(({ data }) => {
            dispatch({ type: "SET_INTERACTIONS", payload: data ? fromDb<WebsiteInteraction>(data) : [] });
          });

        // Load assets
        supabaseClient
          .from("website_assets")
          .select("*")
          .eq("site_id", siteId)
          .then(({ data }) => {
            dispatch({ type: "SET_ASSETS", payload: data ? fromDb<WebsiteAsset>(data) : [] });
          });
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [siteId, dispatch]);

  // Load elements when page changes
  useEffect(() => {
    if (!state.currentPageId) return;
    const loadElements = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("website_elements")
          .select("*")
          .eq("page_id", state.currentPageId)
          .order("sort_order");
        if (!error && data) {
          dispatchRaw({ type: "SET_ELEMENTS", payload: fromDb<WebsiteElement>(data) });
          dispatchRaw({ type: "SET_UNSAVED", payload: false });
        }
      } catch { /* */ }
    };
    loadElements();
  }, [state.currentPageId, siteId]);

  // Editor methods
  const selectElement = useCallback((id: string | null) => {
    dispatch({ type: "SET_SELECTED", payload: id });
    if (id && state.rightPanel === null) {
      dispatch({ type: "SET_RIGHT_PANEL", payload: "style" });
    }
  }, [dispatch, state.rightPanel]);

  const addElement = useCallback((partial: Partial<WebsiteElement>, parentId?: string | null) => {
    const newEl: WebsiteElement = {
      id: tempId(),
      pageId: state.currentPageId || "",
      userId: "",
      parentId: parentId ?? state.selectedElementId ?? null,
      tag: partial.tag || "div",
      elementType: partial.elementType || "container",
      textContent: partial.textContent || "",
      innerHTML: partial.innerHTML || "",
      src: partial.src || null,
      href: partial.href || null,
      altText: partial.altText || "",
      sortOrder: state.elements.filter((e) => e.parentId === (parentId ?? state.selectedElementId ?? null)).length,
      depth: 0,
      styles: partial.styles || {},
      responsiveStyles: {},
      stateStyles: {},
      display: partial.display || null,
      position: partial.position || null,
      flexDirection: partial.flexDirection || null,
      flexWrap: partial.flexWrap || null,
      justifyContent: partial.justifyContent || null,
      alignItems: partial.alignItems || null,
      gap: partial.gap || null,
      gridTemplate: partial.gridTemplate || null,
      width: partial.width || null,
      height: partial.height || null,
      minWidth: null,
      maxWidth: null,
      minHeight: null,
      maxHeight: null,
      marginTop: null,
      marginRight: null,
      marginBottom: null,
      marginLeft: null,
      paddingTop: null,
      paddingRight: null,
      paddingBottom: null,
      paddingLeft: null,
      fontFamily: null,
      fontSize: partial.fontSize || null,
      fontWeight: partial.fontWeight || null,
      lineHeight: partial.lineHeight || null,
      letterSpacing: null,
      textAlign: null,
      textDecoration: null,
      textTransform: null,
      color: null,
      backgroundColor: partial.backgroundColor || null,
      backgroundImage: null,
      backgroundSize: null,
      backgroundPosition: null,
      backgroundRepeat: null,
      borderWidth: null,
      borderStyle: null,
      borderColor: null,
      borderRadius: partial.borderRadius || null,
      opacity: null,
      boxShadow: null,
      overflow: null,
      zIndex: null,
      cursor: partial.cursor || null,
      transition: null,
      transform: null,
      filter: null,
      backdropFilter: null,
      cssClasses: [],
      customAttributes: {},
      isVisible: true,
      isLocked: false,
      label: partial.label || null,
      collectionId: null,
      collectionField: null,
      symbolId: null,
      isSymbolMaster: false,
      config: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Push to undo
    dispatchRaw({ type: "SET_ELEMENTS", payload: [...state.elements, newEl] });
    dispatch({ type: "SET_SELECTED", payload: newEl.id });
  }, [state.elements, state.currentPageId, state.selectedElementId, dispatch]);

  const updateElement = useCallback((id: string, updates: Partial<WebsiteElement>) => {
    const updated = state.elements.map((el) =>
      el.id === id ? { ...el, ...updates, updatedAt: new Date().toISOString() } : el
    );
    dispatchRaw({ type: "SET_ELEMENTS", payload: updated });
  }, [state.elements]);

  const deleteElement = useCallback((id: string) => {
    // Remove element and all its children
    const toRemove = new Set<string>();
    const addDescendants = (parentId: string) => {
      toRemove.add(parentId);
      state.elements.forEach((el) => {
        if (el.parentId === parentId) addDescendants(el.id);
      });
    };
    addDescendants(id);
    const remaining = state.elements.filter((el) => !toRemove.has(el.id));
    dispatchRaw({ type: "SET_ELEMENTS", payload: remaining });
    if (state.selectedElementId === id) dispatch({ type: "SET_SELECTED", payload: null });
  }, [state.elements, state.selectedElementId, dispatch]);

  const moveElement = useCallback((id: string, direction: "up" | "down") => {
    const el = state.elements.find((e) => e.id === id);
    if (!el) return;
    const siblings = state.elements
      .filter((e) => e.parentId === el.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = siblings.findIndex((s) => s.id === id);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;

    const updated = state.elements.map((e) => {
      if (e.id === siblings[idx].id) return { ...e, sortOrder: siblings[targetIdx].sortOrder };
      if (e.id === siblings[targetIdx].id) return { ...e, sortOrder: siblings[idx].sortOrder };
      return e;
    });
    dispatchRaw({ type: "SET_ELEMENTS", payload: updated });
  }, [state.elements]);

  const duplicateElement = useCallback((id: string) => {
    const el = state.elements.find((e) => e.id === id);
    if (!el) return;
    const newEl = {
      ...el,
      id: tempId(),
      label: el.label ? `${el.label} (copy)` : null,
      sortOrder: el.sortOrder + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatchRaw({ type: "SET_ELEMENTS", payload: [...state.elements, newEl] });
    dispatch({ type: "SET_SELECTED", payload: newEl.id });
  }, [state.elements, dispatch]);

  const saveDocument = useCallback(async () => {
    if (!state.site || !state.currentPageId) return;
    dispatch({ type: "SET_SAVING", payload: true });
    try {
      // Delete existing elements for this page, then insert current ones
      await supabaseClient
        .from("website_elements")
        .delete()
        .eq("page_id", state.currentPageId);

      if (state.elements.length > 0) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const rows = state.elements.map((el, idx) => {
          const { id, ...rest } = toDb(el as unknown as Record<string, unknown>);
          return { ...rest, id: el.id, page_id: state.currentPageId, sort_order: idx, user_id: user?.id };
        });
        await supabaseClient.from("website_elements").insert(rows);
      }
      dispatch({ type: "SET_UNSAVED", payload: false });
    } catch { /* */ } finally {
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, [state.site, state.currentPageId, state.elements, dispatch]);

  const undo = useCallback(() => {
    if (state.undoStack.length === 0) return;
    const prev = state.undoStack[state.undoStack.length - 1];
    dispatchRaw({ type: "SET_ELEMENTS", payload: prev });
  }, [state.undoStack]);

  const redo = useCallback(() => {
    if (state.redoStack.length === 0) return;
    const next = state.redoStack[state.redoStack.length - 1];
    dispatchRaw({ type: "SET_ELEMENTS", payload: next });
  }, [state.redoStack]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveDocument();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedElementId && !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          deleteElement(state.selectedElementId);
        }
      }
      if (e.key === "Escape") {
        dispatch({ type: "SET_SELECTED", payload: null });
        if (state.isPreview) dispatch({ type: "SET_PREVIEW", payload: false });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveDocument, undo, redo, deleteElement, state.selectedElementId, state.isPreview, dispatch]);

  const contextValue: EditorContextValue = useMemo(() => ({
    ...state,
    dispatch,
    selectElement,
    addElement,
    updateElement,
    deleteElement,
    moveElement,
    duplicateElement,
    saveDocument,
    undo,
    redo,
  }), [state, dispatch, selectElement, addElement, updateElement, deleteElement, moveElement, duplicateElement, saveDocument, undo, redo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Loading website...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-3" />
          <p className="text-sm font-medium mb-1">Failed to load</p>
          <p className="text-xs text-muted-foreground mb-3">{loadError}</p>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Back to Sites
          </Button>
        </div>
      </div>
    );
  }

  return (
    <EditorContext.Provider value={contextValue}>
      <div className="h-screen flex flex-col bg-background">
        {/* Preview bar (above topbar when in preview mode) */}
        <PreviewBar />

        {/* Top Bar */}
        {!state.isPreview && <TopBar onBack={onBack} />}

        {/* Main Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbar (icon strip) */}
          {!state.isPreview && <LeftToolbar />}

          {/* Left Panel (content) */}
          {!state.isPreview && state.leftPanel && (
            <div className="w-60 border-r bg-background flex flex-col">
              <div className="flex items-center justify-end p-1 border-b">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => dispatch({ type: "SET_LEFT_PANEL", payload: null })}
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                {state.leftPanel === "elements" && <ElementPalette />}
                {state.leftPanel === "pages" && <PagesPanel />}
                {state.leftPanel === "layers" && <LayersPanel />}
                {state.leftPanel === "assets" && <AssetsPanel />}
                {state.leftPanel === "cms" && <CMSPanel />}
              </div>
            </div>
          )}

          {/* Canvas */}
          <Canvas />

          {/* Right Panel (content) */}
          {!state.isPreview && state.rightPanel && (
            <div className="w-72 border-l bg-background flex flex-col">
              <div className="flex items-center justify-start p-1 border-b">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => dispatch({ type: "SET_RIGHT_PANEL", payload: null })}
                >
                  <PanelRightClose className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                {state.rightPanel === "style" && <StylingPanel />}
                {state.rightPanel === "settings" && <SiteSettingsPanel />}
                {state.rightPanel === "interactions" && <InteractionsPanel />}
              </div>
            </div>
          )}

          {/* Right Toolbar (icon strip) */}
          {!state.isPreview && <RightToolbar />}
        </div>
      </div>
    </EditorContext.Provider>
  );
}

// ===========================================================================
// MAIN PAGE (Site list or Editor)
// ===========================================================================

export default function WebsiteBuilderPage() {
  const navigate = useNavigate();
  const params = useParams();
  const catchAll = params["*"];

  // Determine view: if we have a site ID in the URL, show editor
  const [viewMode, setViewMode] = useState<ViewMode>(catchAll ? "editor" : "sites");
  const [activeSiteId, setActiveSiteId] = useState<string | null>(catchAll || null);

  useEffect(() => {
    if (catchAll) {
      setViewMode("editor");
      setActiveSiteId(catchAll);
    } else {
      setViewMode("sites");
      setActiveSiteId(null);
    }
  }, [catchAll]);

  const openSite = (siteId: string) => {
    setActiveSiteId(siteId);
    setViewMode("editor");
    navigate(`/website/${siteId}`);
  };

  const goBack = () => {
    setActiveSiteId(null);
    setViewMode("sites");
    navigate("/website");
  };

  if (viewMode === "editor" && activeSiteId) {
    return <WebsiteEditor siteId={activeSiteId} onBack={goBack} />;
  }

  return <SitesDashboard onOpenSite={openSite} />;
}
