"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type DialogAction = { label: string; variant?: "primary" | "secondary"; onClick?: () => void };
type DialogState = { open: boolean; title?: string; description?: string; actions?: DialogAction[] };

const Ctx = createContext<{ open: (args: Omit<DialogState, "open">) => void } | null>(null);

export function useAppDialog() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppDialog must be used within GlobalDialogProvider");
  return ctx;
}

export default function GlobalDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({ open: false });
  const open = (args: Omit<DialogState, "open">) => setState({ open: true, ...args });
  useEffect(() => {
    (window as any).appDialog = { open };
    return () => { delete (window as any).appDialog; };
  }, []);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <Dialog open={state.open} onOpenChange={(o) => setState((s) => ({ ...s, open: o }))}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-md text-gray-100 border-gray-700/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{state.title}</DialogTitle>
            {state.description ? <DialogDescription>{state.description}</DialogDescription> : null}
          </DialogHeader>
          <DialogFooter>
            <div className="flex gap-2">
              {(state.actions ?? [{ label: "Close", variant: "primary" }]).map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    a.onClick?.();
                    setState((s) => ({ ...s, open: false }));
                  }}
                  className={a.variant === "secondary"
                    ? "px-3 py-2 rounded-md border border-gray-700 bg-black text-white hover:bg-black/80"
                    : "px-3 py-2 rounded-md bg-white text-black hover:bg-gray-200"}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}
