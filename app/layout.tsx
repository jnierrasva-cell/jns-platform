import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PRODUCTION_SITE_URL } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "JNS Systems | CRM & Business Management Software",
    template: "%s | JNS Systems",
  },
  description:
    "Manage client relationships and organize business workflows with JNS Systems. Explore tools for client management, bookings, forms, and follow-ups in one workspace.",
  metadataBase: PRODUCTION_SITE_URL,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body
        className="flex min-h-full flex-col bg-zinc-50 font-sans text-zinc-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}