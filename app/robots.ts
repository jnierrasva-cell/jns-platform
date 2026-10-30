import type { MetadataRoute } from "next";
import { PRODUCTION_SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/admin",
          "/api",
          "/onboarding",
          "/invite",
          "/auth/callback",
        ],
      },
    ],
    sitemap: new URL("/sitemap.xml", PRODUCTION_SITE_URL).toString(),
  };
}
