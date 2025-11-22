import { Toaster } from "@/components/ui/sonner";
import type { ReactNode } from "react";

/**
 * ToastProvider - Provider dla toast notifications
 *
 * Wrapper dla Sonner Toaster z konfiguracją dla aplikacji
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          classNames: {
            toast: "group",
            title: "font-semibold",
            description: "text-sm opacity-90",
            actionButton: "bg-primary text-primary-foreground",
            cancelButton: "bg-muted text-muted-foreground",
          },
        }}
        closeButton
        richColors
      />
    </>
  );
}
