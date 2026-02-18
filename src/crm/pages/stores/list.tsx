import { useState } from "react";
import { useTable, useNavigation, HttpError } from "@refinedev/core";
import dayjs from "dayjs";
import {
  StoreIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  List,
  MapPin,
  Mail,
  Phone,
  Eye,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

import { Card, CardContent } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Input } from "@crm/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@crm/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@crm/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";

import type { IStore } from "@crm/types/finefoods";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@crm/components/ui/tooltip";

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function StorefrontLink({ storeName, isActive }: { storeName: string; isActive: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/store/${toSlug(storeName)}`;

  if (!isActive) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                window.open(url, "_blank");
              }}
            >
              <ExternalLink className="h-3.5 w-3.5 text-primary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View Storefront</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied!" : "Copy Store Link"}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export default function StoresList() {
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  const { show, create } = useNavigation();

  const {
    tableQuery: tableQueryResult,
    current,
    setCurrent,
    pageCount,
    pageSize,
    setPageSize,
    setFilters,
  } = useTable<IStore, HttpError>({
    resource: "stores",
    pagination: { pageSize: 10 },
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  }) as any;

  const data = tableQueryResult?.data;
  const isLoading = tableQueryResult?.isLoading;
  const stores = (data?.data ?? []) as IStore[];
  const total = (data?.total ?? 0) as number;

  const handleSearch = (value: string) => {
    if (value) {
      setFilters([{ field: "title", operator: "contains", value }], "replace");
    } else {
      setFilters([], "replace");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <StoreIcon className="h-6 w-6 text-primary" />
            Stores
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage store locations
          </p>
        </div>
        <Button onClick={() => create("stores")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Store
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stores..."
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "card")}>
          <TabsList>
            <TabsTrigger value="table">
              <List className="h-4 w-4 mr-1" />
              Table
            </TabsTrigger>
            <TabsTrigger value="card">
              <MapPin className="h-4 w-4 mr-1" />
              Cards
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {viewMode === "table" ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Storefront</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-20 animate-pulse bg-muted rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : stores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No stores found
                    </TableCell>
                  </TableRow>
                ) : (
                  stores.map((store) => (
                    <TableRow
                      key={store.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => show("stores", store.id)}
                    >
                      <TableCell className="font-medium">{store.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {store.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {store.gsm}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground max-w-[200px] truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {store.address}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={store.isActive ? "default" : "secondary"}
                          className="gap-1"
                        >
                          {store.isActive ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {store.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dayjs(store.createdAt).format("MMM D, YYYY")}
                      </TableCell>
                      <TableCell>
                        <StorefrontLink storeName={store.title} isActive={store.isActive} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            show("stores", store.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6 space-y-3">
                    <div className="h-4 w-3/4 animate-pulse bg-muted rounded" />
                    <div className="h-3 w-1/2 animate-pulse bg-muted rounded" />
                  </CardContent>
                </Card>
              ))
            : stores.map((store) => (
                <Card
                  key={store.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => show("stores", store.id)}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{store.title}</h3>
                        <Badge
                          variant={store.isActive ? "default" : "secondary"}
                          className="gap-1 mt-1"
                        >
                          {store.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <StoreIcon className="h-5 w-5 text-primary" />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {store.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{store.address}</span>
                        </div>
                      )}
                      {store.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{store.email}</span>
                        </div>
                      )}
                      {store.gsm && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{store.gsm}</span>
                        </div>
                      )}
                    </div>

                    {store.isActive && (
                      <div className="pt-2 border-t">
                        <StorefrontLink storeName={store.title} isActive={store.isActive} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {((current - 1) * pageSize) + 1} to{" "}
          {Math.min(current * pageSize, total)} of {total}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v))}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={current <= 1}
            onClick={() => setCurrent(current - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {current} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={current >= pageCount}
            onClick={() => setCurrent(current + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
