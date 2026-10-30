import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("Account setup");

export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
