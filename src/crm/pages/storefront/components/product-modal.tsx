import { useState } from "react";
import {
  Minus,
  Plus,
  ShoppingCart,
  Star,
  ImageOff,
  Package,
  Tag,
  Info,
} from "lucide-react";
import { Button } from "@crm/components/ui/button";
import { Badge } from "@crm/components/ui/badge";
import { Separator } from "@crm/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@crm/components/ui/dialog";
import type { IProduct } from "@crm/types/finefoods";

interface StorefrontProductModalProps {
  product: IProduct | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (product: IProduct, qty: number) => void;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(price);
}

export function StorefrontProductModal({
  product,
  open,
  onClose,
  onAddToCart,
}: StorefrontProductModalProps) {
  const [quantity, setQuantity] = useState(1);

  // Reset quantity when product changes
  if (!product) return null;

  const outOfStock = product.stock <= 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setQuantity(1);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          {/* Product Image */}
          <div className="aspect-square bg-muted/50 relative overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageOff className="h-16 w-16 text-muted-foreground/20" />
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {outOfStock && (
                <Badge variant="destructive" className="text-xs font-semibold">
                  Out of Stock
                </Badge>
              )}
              {product.stock > 0 && product.stock <= 5 && (
                <Badge
                  variant="secondary"
                  className="text-xs font-semibold bg-amber-100 text-amber-800"
                >
                  Only {product.stock} left
                </Badge>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="p-6 flex flex-col">
            <DialogHeader className="text-left mb-4">
              <DialogTitle className="text-xl font-bold leading-tight">
                {product.name}
              </DialogTitle>
              {product.categoryName && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {product.categoryName}
                  </span>
                </div>
              )}
            </DialogHeader>

            {/* Price */}
            <div className="mb-4">
              <span className="text-3xl font-bold text-primary">
                {formatPrice(product.price)}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            <Separator className="mb-4" />

            {/* Stock info */}
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {outOfStock ? (
                  <span className="text-destructive">Currently unavailable</span>
                ) : (
                  <>
                    <span className="font-medium text-foreground">
                      {product.stock}
                    </span>{" "}
                    in stock
                  </>
                )}
              </span>
            </div>

            {/* Quantity + Add to Cart */}
            <div className="mt-auto space-y-3">
              {!outOfStock && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Qty:</span>
                  <div className="inline-flex items-center rounded-lg border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-r-none"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center text-sm font-semibold">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-l-none"
                      onClick={() =>
                        setQuantity(Math.min(product.stock, quantity + 1))
                      }
                      disabled={quantity >= product.stock}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground ml-auto">
                    Total: <strong>{formatPrice(product.price * quantity)}</strong>
                  </span>
                </div>
              )}

              <Button
                className="w-full gap-2"
                size="lg"
                disabled={outOfStock}
                onClick={() => {
                  onAddToCart(product, quantity);
                  setQuantity(1);
                  onClose();
                }}
              >
                <ShoppingCart className="h-4 w-4" />
                {outOfStock ? "Out of Stock" : "Add to Cart"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
