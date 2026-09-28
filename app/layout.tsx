import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JNS — Operations software for service businesses",
  description:
    "Manage contacts, bookings, forms, and automations in one workspace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body
  className="flex min-h-full flex-col bg-[#0B132B] font-sans text-[#F1F5F9]"
  suppressHydrationWarning>
      </body>
    </html>
  );
}
