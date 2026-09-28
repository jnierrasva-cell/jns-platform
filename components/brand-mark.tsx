import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Official mark: public/jns-logo1.png
 * On dark UI we invert so the mark reads as light (no white box).
 */
export function BrandMark({
  href = "/",
  className,
  inverted = true,
}: {
  href?: string | null;
  className?: string;
  /** true = light mark for dark backgrounds (default for brand dark theme) */
  inverted?: boolean;
}) {
  const mark = (
    <Image
      src="/jns-logo1.png"
      alt="JNS"
      width={140}
      height={40}
      priority
      className={cn(
        "h-8 w-auto object-contain object-left",
        inverted && "brightness-0 invert",
        className,
      )}
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