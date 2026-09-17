import Link from "next/link";
import { cn } from "@/lib/utils";

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
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md text-[13px] font-semibold",
          inverted ? "bg-white text-zinc-900" : "bg-zinc-900 text-white",
        )}
      >
        J
      </span>
      <span
        className={cn(
          "text-[15px] font-semibold tracking-tight",
          inverted ? "text-zinc-900" : "text-zinc-900",
        )}
      >
        JNS
      </span>
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex" aria-label="JNS home">
      {mark}
    </Link>
  );
}
