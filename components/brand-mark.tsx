import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Official mark from public/jns-logo.png (brand kit).
 * inverted = for dark backgrounds (login left panel).
 */
export function BrandMark({
  href = "/",
  className,
  inverted = false,
}: {
  href?: string | null;
  className?: string;
  inverted?: boolean;
}) {
  const mark = (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src="/jns-logo.png"
        alt="JNS"
        width={120}
        height={36}
        priority
        className={cn(
          "h-8 w-auto object-contain object-left",
          // Soft lighten on dark panels if the logo is dark
          inverted && "brightness-0 invert",
        )}
      />
    </span>
  );

  if (href === null || href === undefined) {
    // href omitted → still link home via default; null = no link
  }

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