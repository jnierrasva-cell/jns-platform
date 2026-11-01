import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function SheetBackdrop({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Backdrop>) {
  return (
    <DrawerPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-black/65 backdrop-blur-sm transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function SheetPopup({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Popup>) {
  return (
    <DrawerPrimitive.Popup
      className={cn(
        "h-full w-[min(26rem,calc(100vw-1rem))] overflow-y-auto rounded-l-2xl border-l border-border bg-card p-6 text-card-foreground shadow-[var(--shadow-soft)] outline-none",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      className={cn("font-heading text-lg font-bold text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      className={cn("text-sm leading-6 text-text-secondary", className)}
      {...props}
    />
  );
}

export const Sheet = {
  Root: DrawerPrimitive.Root,
  Trigger: DrawerPrimitive.Trigger,
  Close: DrawerPrimitive.Close,
  Portal: DrawerPrimitive.Portal,
  Backdrop: SheetBackdrop,
  Viewport: DrawerPrimitive.Viewport,
  Popup: SheetPopup,
  Content: DrawerPrimitive.Content,
  Title: SheetTitle,
  Description: SheetDescription,
};