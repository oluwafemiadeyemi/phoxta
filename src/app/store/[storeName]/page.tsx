"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

// Load the storefront client-side only (depends on browser APIs)
const StorefrontPage = dynamic(
  () => import("@/crm/pages/storefront"),
  { ssr: false },
);

export default function StorePublicPage() {
  const params = useParams<{ storeName: string }>();
  return <StorefrontPage storeSlug={params.storeName} />;
}
