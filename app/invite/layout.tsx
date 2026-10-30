import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("Workspace invitation");

export default function InviteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
