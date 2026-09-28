import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({
  href = "/",
  className,
}: {
  href?: string | null;
  className?: string;
  /** kept so older pages that pass inverted do not crash */
  inverted?: boolean;
}) {
  const mark = (
    <Image
      src="/jns-logo.png"
      alt="JNS"
      width={120}
      height={36}
      priority
      className={cn("h-8 w-auto object-contain object-left", className)}
    />
  );

  if (href === null) return mark;

  return (
    <Link
      href={href || "/"}
      className="inline-flex items-center"
      aria-label="JNS home"
    >
      {mark}
    </Link>
  );
}