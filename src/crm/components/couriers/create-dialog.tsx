import { useState } from "react";
import { useCreate, HttpError } from "@refinedev/core";
import {
  Truck,
  User,
  CarFront,
  CheckCircle2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@crm/components/ui/dialog";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/components/ui/select";

interface CreateCourierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  { id: 1, label: "Personal Info", icon: User },
  { id: 2, label: "Vehicle", icon: CarFront },
  { id: 3, label: "Assignment", icon: Truck },
];

export function CreateCourierDialog({ open, onOpenChange }: CreateCourierDialogProps) {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [gsm, setGsm] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleType, setVehicleType] = useState("Car");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");

  const [status, setStatus] = useState("Available");
  const [storeName, setStoreName] = useState("");
  const [storeId, setStoreId] = useState("");

  const { mutate: createCourier } = useCreate<any, HttpError>();

  const resetForm = () => {
    setStep(1);
    setName("");
    setSurname("");
    setEmail("");
    setGsm("");
    setAvatarUrl("");
    setLicensePlate("");
    setVehicleModel("");
    setVehicleType("Car");
    setVehicleColor("");
    setVehicleYear("");
    setStatus("Available");
    setStoreName("");
    setStoreId("");
  };

  const handleCreate = () => {
    setIsSaving(true);
    const values: Record<string, any> = {
      name,
      surname,
      email,
      gsm,
      avatarUrl: avatarUrl || null,
      licensePlate: licensePlate || null,
      vehicle: vehicleModel
        ? {
            model: vehicleModel,
            vehicleType,
            color: vehicleColor || null,
            year: vehicleYear ? Number(vehicleYear) : null,
          }
        : null,
      status,
      storeName: storeName || null,
      storeId: storeId || null,
    };

    createCourier(
      { resource: "couriers", values },
      {
        onSuccess: () => {
          setIsSaving(false);
          resetForm();
          onOpenChange(false);
        },
        onError: () => setIsSaving(false),
      }
    );
  };

  const canNext = () => {
    if (step === 1) return name.trim() !== "" && surname.trim() !== "";
    if (step === 2) return true; // Vehicle is optional
    return true;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Courier</DialogTitle>
        </DialogHeader>

        {/* Steps Indicator */}
        <div className="flex items-center gap-2 mb-4">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
                {s.label}
              </div>
            );
          })}
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John" />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={gsm} onChange={(e) => setGsm(e.target.value)} placeholder="+1 234 567 8900" />
            </div>
            <div className="space-y-2">
              <Label>Avatar URL</Label>
              <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
        )}

        {/* Step 2: Vehicle */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>License Plate</Label>
              <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="ABC-1234" />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Model</Label>
              <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Toyota Corolla" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Car">Car</SelectItem>
                    <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="Bicycle">Bicycle</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value)}
                  placeholder="2024"
                  type="number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} placeholder="White" />
            </div>
          </div>
        )}

        {/* Step 3: Assignment */}
        {step === 3 && (
          <div className="space-y-4">
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
              <Label>Store Name</Label>
              <Input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Main Store"
              />
            </div>
            <div className="space-y-2">
              <Label>Store ID (optional)</Label>
              <Input
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                placeholder="UUID of the store"
              />
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => (step === 1 ? onOpenChange(false) : setStep(step - 1))}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Next
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? "Creating..." : "Create Courier"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
