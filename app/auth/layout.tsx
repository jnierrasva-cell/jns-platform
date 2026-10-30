import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("Reset password");

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
