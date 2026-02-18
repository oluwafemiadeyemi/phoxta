import { useState } from "react";
import { useCreate } from "@refinedev/core";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  StoreIcon,
  MapPin,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Switch } from "@crm/components/ui/switch";

export default function StoresCreate() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [gsm, setGsm] = useState("");
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { mutate: createStore } = useCreate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    createStore(
      {
        resource: "stores",
        values: {
          title,
          email,
          gsm,
          isActive,
          address,
        },
      },
      {
        onSuccess: () => navigate("/stores"),
        onError: () => setIsSaving(false),
      }
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/stores")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <StoreIcon className="h-6 w-6 text-primary" />
            Create Store
          </h1>
          <p className="text-muted-foreground">Add a new store location</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Store Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="title">Store Name</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter store name"
                required
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="store@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gsm">Phone</Label>
                <Input
                  id="gsm"
                  value={gsm}
                  onChange={(e) => setGsm(e.target.value)}
                  placeholder="+1 234 567 890"
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter store address"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">
                  Store is active and operational
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate("/stores")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !title}>
                Create Store
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
