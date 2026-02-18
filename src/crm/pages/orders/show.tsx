import { useShow, useUpdate, useList, HttpError } from "@refinedev/core";
import { useCurrency } from "@crm/hooks/use-currency";
import { useParams, useNavigate } from "react-router";
import dayjs from "dayjs";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Store,
  CreditCard,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Separator } from "@crm/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@crm/components/ui/table";

import type { IOrder, IOrderProduct } from "@crm/types/finefoods";

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  Ready: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "On The Way": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusSteps = ["Pending", "Ready", "On The Way", "Delivered"];

const statusIcons: Record<string, React.ReactNode> = {
  Pending: <Clock className="h-5 w-5" />,
  Ready: <Package className="h-5 w-5" />,
  "On The Way": <Truck className="h-5 w-5" />,
  Delivered: <CheckCircle2 className="h-5 w-5" />,
  Cancelled: <XCircle className="h-5 w-5" />,
};

export default function OrdersShow() {
  const { format } = useCurrency();
  const { id } = useParams();
  const navigate = useNavigate();

  const { query: queryResult } = useShow<IOrder, HttpError>({
    resource: "orders",
    id,
  });

  const { data, isLoading } = queryResult;
  const order = data?.data;

  // Fetch order products
  const { data: orderProductsData } = useList<IOrderProduct, HttpError>({
    resource: "orderProducts",
    pagination: { pageSize: 50 },
    filters: order ? [{ field: "orderId", operator: "eq", value: order.id }] : [],
    queryOptions: { enabled: !!order },
  }) as any;

  const orderProducts = (orderProductsData?.data ?? []) as IOrderProduct[];

  const { mutate: updateOrder } = useUpdate();

  const handleStatusChange = (newStatus: string) => {
    if (!order) return;
    updateOrder({
      resource: "orders",
      id: order.id,
      values: { status: newStatus },
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 animate-pulse bg-muted rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 animate-pulse bg-muted rounded-lg" />
            <div className="h-64 animate-pulse bg-muted rounded-lg" />
          </div>
          <div className="space-y-6">
            <div className="h-48 animate-pulse bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Order not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/orders")}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const currentStepIndex = statusSteps.indexOf(order.status);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/orders")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-muted-foreground">
              Created {dayjs(order.createdAt).format("MMMM D, YYYY h:mm A")}
            </p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className={`text-sm px-3 py-1 ${statusColors[order.status] || ""}`}
        >
          {statusIcons[order.status]}
          <span className="ml-1">{order.status}</span>
        </Badge>
      </div>

      {/* Status Timeline */}
      {order.status !== "Cancelled" && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                      >
                        {statusIcons[step]}
                      </div>
                      <span
                        className={`text-xs mt-2 ${
                          isActive ? "text-primary font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 ${
                          index < currentStepIndex ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products ({orderProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orderProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No products in this order
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderProducts.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {item.productImageUrl ? (
                                <img
                                  src={item.productImageUrl}
                                  alt={item.productName || "Product"}
                                  className="h-10 w-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <p className="font-medium text-sm">
                                {item.productName || "Unknown Product"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {format(Number(item.price))}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right font-medium">
                            {format(Number(item.price) * item.quantity)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Separator className="my-4" />
                </>
              )}
              <div className="flex justify-end">
                <div className="space-y-1 text-right">
                  <div className="flex justify-between gap-8">
                    <span className="font-semibold">Total</span>
                    <span className="text-lg font-bold text-primary">
                      {format(Number(order.amount))}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium">
                  {order.customerName?.charAt(0) || "?"}
                </div>
                <p className="font-medium">{order.customerName || "—"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Store Info */}
          {order.storeName && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Store
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{order.storeName}</p>
              </CardContent>
            </Card>
          )}

          {/* Courier Info */}
          {order.courierName && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Courier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {order.courierName?.charAt(0)}
                  </div>
                  <p className="font-medium">{order.courierName}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {order.status === "Pending" && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => handleStatusChange("Ready")}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Accept Order
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleStatusChange("Cancelled")}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Order
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
