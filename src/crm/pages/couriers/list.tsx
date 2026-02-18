import { useState } from "react";
import { useTable, useDelete, HttpError } from "@refinedev/core";
import { useNavigate } from "react-router";
import dayjs from "dayjs";
import {
  Truck,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  Edit,
  Trash2,
} from "lucide-react";

import { Card, CardContent } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Input } from "@crm/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@crm/components/ui/alert-dialog";

import type { ICourier } from "@crm/types/finefoods";
import { CreateCourierDialog } from "@crm/components/couriers/create-dialog";

const statusColors: Record<string, string> = {
  Available: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "On delivery": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "On leave": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Offline: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function CouriersList() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const {
    tableQuery,
    current,
    setCurrent,
    pageCount,
    pageSize,
    setPageSize,
    setFilters,
  } = useTable<ICourier, HttpError>({
    resource: "couriers",
    pagination: { pageSize: 12 },
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  }) as any;

  const { mutate: deleteCourier } = useDelete();

  const couriers = (tableQuery?.data?.data ?? []) as ICourier[];
  const isLoading = tableQuery?.isLoading;

  const handleSearch = (value: string) => {
    setSearchText(value);
    setFilters([{ field: "name", operator: "contains", value: value || undefined }]);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteCourier({ resource: "couriers", id: deleteId });
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Couriers</h1>
          <p className="text-muted-foreground">
            Manage your delivery couriers
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Courier
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search couriers..."
            className="pl-9"
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Select
          onValueChange={(value) => {
            setFilters([
              { field: "name", operator: "contains", value: searchText || undefined },
              { field: "status", operator: "eq", value: value === "all" ? undefined : value },
            ]);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="On delivery">On delivery</SelectItem>
            <SelectItem value="On leave">On leave</SelectItem>
            <SelectItem value="Offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Courier Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      ) : couriers.length === 0 ? (
        <div className="text-center py-12">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No couriers found</p>
          <Button variant="outline" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add your first courier
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {couriers.map((courier) => (
            <Card
              key={courier.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate(`/couriers/edit/${courier.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {courier.avatarUrl ? (
                      <img
                        src={courier.avatarUrl}
                        alt={courier.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {courier.name?.[0]}{courier.surname?.[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{courier.name} {courier.surname}</p>
                      <p className="text-xs text-muted-foreground">{courier.email}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        statusColors[courier.status] || statusColors.Offline
                      }`}
                    >
                      {courier.status}
                    </span>
                    {courier.licensePlate && (
                      <Badge variant="outline" className="text-xs">
                        {courier.licensePlate}
                      </Badge>
                    )}
                  </div>

                  {courier.storeName && (
                    <p className="text-xs text-muted-foreground">
                      Store: {courier.storeName}
                    </p>
                  )}

                  {courier.vehicle && (
                    <p className="text-xs text-muted-foreground">
                      {courier.vehicle.model} • {courier.vehicle.vehicleType}
                    </p>
                  )}

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {courier.gsm}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/couriers/edit/${courier.id}`);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(courier.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(pageCount ?? 0) > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {current} of {pageCount}
          </p>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 / page</SelectItem>
                <SelectItem value="24">24 / page</SelectItem>
                <SelectItem value="48">48 / page</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              disabled={current === 1}
              onClick={() => setCurrent(current - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={current === pageCount}
              onClick={() => setCurrent(current + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <CreateCourierDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Courier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
