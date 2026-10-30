import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("Sign in");

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
