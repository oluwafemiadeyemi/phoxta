import { useShow, useList, HttpError } from "@refinedev/core";
import { useCurrency } from "@crm/hooks/use-currency";
import dayjs from "dayjs";
import {
  X,
  Mail,
  Phone,
  User,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@crm/components/ui/sheet";
import { Badge } from "@crm/components/ui/badge";
import { Separator } from "@crm/components/ui/separator";
import { Button } from "@crm/components/ui/button";
import { ScrollArea } from "@crm/components/ui/scroll-area";

import type { ICustomer, IOrder } from "@crm/types/finefoods";

interface CustomerShowDrawerProps {
  customerId: string | null;
  onClose: () => void;
}

const orderStatusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Ready: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "On The Way": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function CustomerShowDrawer({ customerId, onClose }: CustomerShowDrawerProps) {
  const { format } = useCurrency();
  const { query: queryResult } = useShow<ICustomer, HttpError>({
    resource: "customers",
    id: customerId ?? "",
    queryOptions: { enabled: !!customerId },
  });

  const customer = queryResult?.data?.data;
  const isLoading = queryResult?.isLoading;

  // Fetch orders for this customer
  const { query: ordersQuery } = useList<IOrder, HttpError>({
    resource: "orders",
    filters: customerId
      ? [{ field: "customerId", operator: "eq", value: customerId }]
      : [],
    pagination: { pageSize: 20 },
    sorters: [{ field: "createdAt", order: "desc" }],
    queryOptions: { enabled: !!customerId },
  });

  const orders = (ordersQuery?.data?.data ?? []) as IOrder[];
  const ordersLoading = ordersQuery?.isLoading;
  const totalSpent = orders.reduce((sum: number, o: IOrder) => sum + Number(o.amount || 0), 0);

  return (
    <Sheet open={!!customerId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <SheetHeader>
              <SheetTitle>Customer Details</SheetTitle>
            </SheetHeader>

            {isLoading ? (
              <div className="space-y-4">
                <div className="h-16 animate-pulse bg-muted rounded" />
                <div className="h-32 animate-pulse bg-muted rounded" />
              </div>
            ) : customer ? (
              <>
                {/* Profile */}
                <div className="flex items-center gap-4">
                  {customer.avatarUrl ? (
                    <img
                      src={customer.avatarUrl}
                      alt={customer.fullName}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold">
                      {customer.fullName || `${customer.firstName} ${customer.lastName}`}
                    </h2>
                    <Badge
                      variant={customer.isActive ? "default" : "secondary"}
                      className="mt-1 gap-1"
                    >
                      {customer.isActive ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {customer.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{customer.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{customer.gsm || "—"}</span>
                  </div>
                  {customer.address && (
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{customer.address}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Customer since {dayjs(customer.createdAt).format("MMMM D, YYYY")}
                  </p>
                </div>

                <Separator />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{orders.length}</p>
                    <p className="text-xs text-muted-foreground">Orders</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{format(totalSpent)}</p>
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">
                      {orders.length > 0 ? format(totalSpent / orders.length) : format(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Order</p>
                  </div>
                </div>

                <Separator />

                {/* Orders */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    Recent Orders
                  </h3>

                  {ordersLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-16 animate-pulse bg-muted rounded" />
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No orders yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              Order #{order.orderNumber || order.id.slice(0, 8)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {dayjs(order.createdAt).format("MMM DD, YYYY")}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {format(Number(order.amount))}
                            </p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                orderStatusColors[order.status] || "bg-muted text-muted-foreground"
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Customer not found
              </p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
