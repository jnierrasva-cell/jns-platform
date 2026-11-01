import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { PRODUCTION_SITE_URL } from "@/lib/seo";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
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
    <html
      lang="en"
      className={`${bricolage.variable} ${dmSans.variable} dark h-full antialiased`}
    >
      <body
        className="flex min-h-full flex-col bg-background font-sans text-foreground"
        suppressHydrationWarning
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}