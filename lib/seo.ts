import type { Metadata } from "next";

export const PRODUCTION_SITE_URL = new URL("https://www.jnsystem.app");

export function getApplicationOrigin(): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(
    /\/+$/,
    "",
  );

  if (process.env.VERCEL_ENV === "preview") {
    const previewUrl = process.env.VERCEL_URL;
    return (
      configuredOrigin ||
      (previewUrl ? new URL(`https://${previewUrl}`).origin : null) ||
      PRODUCTION_SITE_URL.origin
    );
  }

  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_SITE_URL.origin;
  }

  return configuredOrigin || PRODUCTION_SITE_URL.origin;
}

export function createPublicMetadata({
  title,
  description,
  pathname,
}: {
  title: string;
  description: string;
  pathname: string;
}): Metadata {
  const url = new URL(pathname, PRODUCTION_SITE_URL).toString();

  return {
    title: { absolute: title },
    description,
    ...(pathname === "/" ? {} : { alternates: { canonical: url } }),
    openGraph: {
      title,
      description,
      url,
      siteName: "JNS Systems",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export function createNoIndexMetadata(title: string): Metadata {
  return {
    title,
    robots: {
      index: false,
      follow: false,
    },
  };
}
