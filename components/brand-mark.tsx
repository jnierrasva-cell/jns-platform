import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * jns-logo1.png = dark navy mark (for light UI)
 * inverted = white treatment for dark panels (login left)
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