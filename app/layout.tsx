import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "JNS — Workspace for clients, bookings, and follow-up",
    template: "%s · JNS",
  },
  description:
    "Journey Network Systems is the operating workspace for service businesses. Contacts under your rules, bookings on the calendar, forms, team process, and connected tools in one place.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      "https://jns-platform.vercel.app",
  ),
  openGraph: {
    title: "JNS — Workspace for clients, bookings, and follow-up",
    description:
      "Contacts, bookings, intake, and follow-up for service businesses—in one workspace.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JNS — Workspace for clients, bookings, and follow-up",
    description:
      "Contacts, bookings, intake, and follow-up for service businesses—in one workspace.",
  },
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
