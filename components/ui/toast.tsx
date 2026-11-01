"use client";

import { Toast } from "@base-ui/react/toast";
import type { ReactNode } from "react";

function ToastItems() {
  const { toasts } = Toast.useToastManager();

  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="mb-3 w-full rounded-xl border border-border bg-card text-card-foreground shadow-[var(--shadow-soft)] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Toast.Content className="flex items-start gap-4 p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <Toast.Title className="text-sm font-semibold text-foreground" />
          <Toast.Description className="text-sm leading-5 text-text-secondary" />
        </div>
        <Toast.Close
          className="min-h-11 min-w-11 rounded-lg text-sm text-text-secondary hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="Dismiss notification"
        >
          Close
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex w-auto max-w-[24rem] flex-col-reverse sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[24rem]">
          <ToastItems />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

export function useToast() {
  return Toast.useToastManager();
}