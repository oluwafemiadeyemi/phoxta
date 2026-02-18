import { useState } from "react";
import { useTable, HttpError } from "@refinedev/core";
import { useCurrency } from "@crm/hooks/use-currency";
import dayjs from "dayjs";
import {
  Package,
  LayoutGrid,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
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

import type { IProduct } from "@crm/types/finefoods";
import { ProductDrawerForm } from "@crm/components/products/drawer-form";

export default function ProductsList() {
  const { format } = useCurrency();
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<IProduct | null>(null);
  const [searchText, setSearchText] = useState("");

  const {
    tableQuery: tableQueryResult,
    current,
    setCurrent,
    pageCount,
    pageSize,
    setPageSize,
    setFilters,
  } = useTable<IProduct, HttpError>({
    resource: "products",
    pagination: { pageSize: 12 },
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  }) as any;

  const data = tableQueryResult?.data;
  const isLoading = tableQueryResult?.isLoading;
  const products = (data?.data ?? []) as IProduct[];
  const total = (data?.total ?? 0) as number;

  const handleSearch = (value: string) => {
    setSearchText(value);
    if (value) {
      setFilters([{ field: "name", operator: "contains", value }], "replace");
    } else {
      setFilters([], "replace");
    }
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setDrawerOpen(true);
  };

  const handleEdit = (product: IProduct) => {
    setEditingProduct(product);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Products
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your product catalog
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchText}
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
              <LayoutGrid className="h-4 w-4 mr-1" />
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
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
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
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {product.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {product.categoryName || "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {format(Number(product.price))}
                      </TableCell>
                      <TableCell className="text-right">{product.stock}</TableCell>
                      <TableCell>
                        <Badge variant={product.isActive ? "default" : "secondary"}>
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dayjs(product.createdAt).format("MMM D, YYYY")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit2 className="h-4 w-4" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <div className="aspect-square animate-pulse bg-muted rounded-t-lg" />
                  <CardContent className="p-4 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse bg-muted rounded" />
                    <div className="h-3 w-1/2 animate-pulse bg-muted rounded" />
                  </CardContent>
                </Card>
              ))
            : products.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => handleEdit(product)}
                >
                  <div className="relative aspect-square bg-muted">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <Badge
                      variant={product.isActive ? "default" : "secondary"}
                      className="absolute top-2 right-2"
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button variant="secondary" size="sm">
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {product.categoryName || "Uncategorized"}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-primary">
                        {format(Number(product.price))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Stock: {product.stock}
                      </span>
                    </div>
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
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="48">48</SelectItem>
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

      {/* Drawer Form */}
      <ProductDrawerForm
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
      />
    </div>
  );
}
