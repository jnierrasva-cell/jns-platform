import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JNS — One workspace for clients, bookings, and follow-up",
  description:
    "Journey Network Systems is the operating workspace for service businesses and the people who run them. Contacts under your rules, bookings on the calendar, connected tools — private pilot.",
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
