import { Store, Mail, Heart, Phone, MapPin, Clock, ArrowRight, ShoppingBag, Headphones, Shield } from "lucide-react";
import { Separator } from "@crm/components/ui/separator";
import { Input } from "@crm/components/ui/input";
import { Button } from "@crm/components/ui/button";

interface StorefrontFooterProps {
  storeName: string;
  storeEmail: string;
  storePhone?: string;
  storeAddress?: string;
}

export function StorefrontFooter({ storeName, storeEmail, storePhone, storeAddress }: StorefrontFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t mt-12 sm:mt-16">
      {/* Feature strip */}
      <div className="border-b bg-background">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            {[
              { icon: ShoppingBag, title: "Fast Shipping", desc: "On orders over £50" },
              { icon: Shield, title: "Secure Payment", desc: "100% secure checkout" },
              { icon: Headphones, title: "24/7 Support", desc: "Dedicated support" },
              { icon: Clock, title: "Fast Delivery", desc: "2-5 business days" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold truncate">{title}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Store info */}
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary text-primary-foreground">
                <Store className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="font-bold text-base sm:text-lg">{storeName}</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
              Thank you for visiting our store. We're dedicated to providing quality products and excellent customer service.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-muted-foreground">
              {[
                { label: "Products", href: "#products" },
                { label: "About Us", href: "#" },
                { label: "Shipping Info", href: "#" },
                { label: "Return Policy", href: "#" },
                { label: "Privacy Policy", href: "#" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="hover:text-foreground transition-colors inline-flex items-center gap-1 group py-0.5">
                    <ArrowRight className="h-3 w-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wider">
              Contact Us
            </h3>
            <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-muted-foreground">
              {storeEmail && (
                <li>
                  <a
                    href={`mailto:${storeEmail}`}
                    className="inline-flex items-center gap-2 hover:text-foreground transition-colors py-0.5"
                  >
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                    <span className="truncate">{storeEmail}</span>
                  </a>
                </li>
              )}
              {storePhone && (
                <li>
                  <a
                    href={`tel:${storePhone}`}
                    className="inline-flex items-center gap-2 hover:text-foreground transition-colors py-0.5"
                  >
                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                    {storePhone}
                  </a>
                </li>
              )}
              {storeAddress && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{storeAddress}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-2 sm:col-span-1">
            <h3 className="font-semibold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wider">
              Stay Updated
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3">
              Subscribe to get updates on new products and exclusive offers.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Your email"
                type="email"
                className="h-9 text-sm bg-background rounded-xl"
              />
              <Button size="sm" className="shrink-0 h-9 px-3 rounded-xl">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator className="my-6 sm:my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            &copy; {currentYear} {storeName}. All rights reserved.
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
            Powered with <Heart className="h-3 w-3 text-red-400 fill-red-400" /> by Phoxta
          </p>
        </div>
      </div>
    </footer>
  );
}
