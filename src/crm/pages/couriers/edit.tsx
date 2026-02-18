import { useState } from "react";
import { useShow, useUpdate, useList, HttpError } from "@refinedev/core";
import { useParams, useNavigate } from "react-router";
import dayjs from "dayjs";
import {
  ArrowLeft,
  Truck,
  MapPin,
  Mail,
  Phone,
  Edit2,
  Save,
  X,
  Star,
  CarFront,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Separator } from "@crm/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";

import type { ICourier, IReview } from "@crm/types/finefoods";

const statusColors: Record<string, string> = {
  Available: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "On delivery": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "On leave": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Offline: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function CouriersEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const { query: queryResult } = useShow<ICourier, HttpError>({
    resource: "couriers",
    id,
  });

  const { data, isLoading } = queryResult;
  const courier = data?.data;

  // Fetch reviews for this courier
  const { query: reviewsQuery } = useList<IReview, HttpError>({
    resource: "reviews",
    filters: id ? [{ field: "courierId", operator: "eq", value: id }] : [],
    pagination: { pageSize: 50 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  const reviews = (reviewsQuery?.data?.data ?? []) as IReview[];
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum: number, r: IReview) => sum + r.star, 0) / reviews.length
      : 0;

  // Edit form state
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [gsm, setGsm] = useState("");
  const [status, setStatus] = useState("Available");
  const [licensePlate, setLicensePlate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { mutate: updateCourier } = useUpdate();

  const startEditing = () => {
    if (courier) {
      setName(courier.name);
      setSurname(courier.surname);
      setEmail(courier.email);
      setGsm(courier.gsm);
      setStatus(courier.status);
      setLicensePlate(courier.licensePlate || "");
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!courier) return;
    setIsSaving(true);
    updateCourier(
      {
        resource: "couriers",
        id: courier.id,
        values: { name, surname, email, gsm, status, licensePlate: licensePlate || null },
      },
      {
        onSuccess: () => { setIsEditing(false); setIsSaving(false); },
        onError: () => setIsSaving(false),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 animate-pulse bg-muted rounded" />
        <div className="h-64 animate-pulse bg-muted rounded-lg" />
      </div>
    );
  }

  if (!courier) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Courier not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/couriers")}>
          Back to Couriers
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/couriers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
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
              <h1 className="text-2xl font-bold">{courier.name} {courier.surname}</h1>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  statusColors[courier.status] || statusColors.Offline
                }`}
              >
                {courier.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={startEditing}>
              <Edit2 className="h-4 w-4 mr-2" /> Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Courier Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={surname} onChange={(e) => setSurname(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={gsm} onChange={(e) => setGsm(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Available">Available</SelectItem>
                          <SelectItem value="On delivery">On delivery</SelectItem>
                          <SelectItem value="On leave">On leave</SelectItem>
                          <SelectItem value="Offline">Offline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>License Plate</Label>
                      <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{courier.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{courier.gsm}</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  {courier.storeName && (
                    <>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Store</p>
                          <p className="font-medium">{courier.storeName}</p>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}
                  {courier.licensePlate && (
                    <div>
                      <p className="text-sm text-muted-foreground">License Plate</p>
                      <Badge variant="outline" className="mt-1">{courier.licensePlate}</Badge>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Created {dayjs(courier.createdAt).format("MMMM D, YYYY")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle */}
          {courier.vehicle && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CarFront className="h-5 w-5" />
                  Vehicle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Model</p>
                    <p className="font-medium">{courier.vehicle.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{courier.vehicle.vehicleType}</p>
                  </div>
                  {courier.vehicle.color && (
                    <div>
                      <p className="text-sm text-muted-foreground">Color</p>
                      <p className="font-medium">{courier.vehicle.color}</p>
                    </div>
                  )}
                  {courier.vehicle.year && (
                    <div>
                      <p className="text-sm text-muted-foreground">Year</p>
                      <p className="font-medium">{courier.vehicle.year}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Reviews */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Reviews ({reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Average Rating */}
              {reviews.length > 0 && (
                <div className="mb-4 text-center">
                  <div className="text-3xl font-bold">{avgRating.toFixed(1)}</div>
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.round(avgRating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No reviews yet
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < review.star
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {dayjs(review.createdAt).format("MMM D")}
                        </span>
                      </div>
                      {review.text && (
                        <p className="text-sm">{review.text}</p>
                      )}
                      {review.customerName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          — {review.customerName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
