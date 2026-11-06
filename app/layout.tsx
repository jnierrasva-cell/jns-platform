import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { PRODUCTION_SITE_URL } from "@/lib/seo";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-heading",
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
      className={`${dmSans.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body
        className="flex min-h-full flex-col bg-[#F4F6FB] font-sans text-slate-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
