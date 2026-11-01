import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function ModalBackdrop({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-black/65 backdrop-blur-sm transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function ModalPopup({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Popup>) {
  return (
    <DialogPrimitive.Popup
      className={cn(
        "fixed left-1/2 top-1/2 z-50 flex max-h-[min(90dvh,48rem)] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-[var(--shadow-soft)] outline-none transition data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function ModalTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-heading text-lg font-bold text-foreground", className)}
      {...props}
    />
  );
}

function ModalDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm leading-6 text-text-secondary", className)}
      {...props}
    />
  );
}

export const Modal = {
  Root: DialogPrimitive.Root,
  Trigger: DialogPrimitive.Trigger,
  Close: DialogPrimitive.Close,
  Portal: DialogPrimitive.Portal,
  Backdrop: ModalBackdrop,
  Popup: ModalPopup,
  Title: ModalTitle,
  Description: ModalDescription,
};