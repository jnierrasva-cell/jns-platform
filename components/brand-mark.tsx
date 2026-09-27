import Image from "next/image";
import Link from "next/link";

export function BrandMark({ href }: { href?: string | null }) {
  const img = (
    <Image
      src="/jns-logo.png"
      alt="JNS"
      width={120}
      height={40}
      className="object-contain"
      priority
    />
  );

  if (!href) return img;
  return (
    <Link href={href} className="inline-flex" aria-label="JNS home">
      {img}
    </Link>
  );
}
