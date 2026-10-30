import type { MetadataRoute } from "next";
import { PRODUCTION_SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "/",
    "/client-management-software",
    "/support",
    "/privacy",
    "/terms",
  ].map((pathname) => ({
    url: new URL(pathname, PRODUCTION_SITE_URL).toString(),
  }));
}
