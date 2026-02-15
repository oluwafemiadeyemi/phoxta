import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : "";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [{ protocol: "https", hostname: supabaseHostname }]
      : [],
  },
  // Refine (@refinedev/core) internally uses useSearchParams() in its
  // RouteChangeHandler — we can't wrap that in Suspense ourselves, so
  // disable the CSR-bailout error for third-party code.
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
