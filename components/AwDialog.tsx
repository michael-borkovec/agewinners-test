/**
 * File purpose
 * - Shared AgeWinners dialog for alerts, confirmations, and short text prompts.
 * Main responsibilities
 * - Replace native browser alert/confirm/prompt windows with consistent app UI.
 * - Expose promise-based helpers usable from components and event handlers.
 * Related APIs, components, or modules
 * - components/AuthShell.tsx
 * - components/AwButton.tsx
 */

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AwButton from "@/components/AwButton";

type DialogKind = "alert" | "confirm" | "prompt";

type DialogOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: string;
  placeholder?: string;
  danger?: boolean;
};

type DialogRequest = DialogOptions & {
  id: number;
  kind: DialogKind;
  resolve: (value: unknown) => void;
};

type AwDialogApi = {
  alert: (options: string | DialogOptions) => Promise<void>;
  confirm: (options: string | DialogOptions) => Promise<boolean>;
  prompt: (options: string | DialogOptions) => Promise<string | null>;
};

const AwDialogContext = createContext<AwDialogApi | null>(null);

let mountedApi: AwDialogApi | null = null;

function toOptions(options: string | DialogOptions): DialogOptions {
  return typeof options === "string" ? { message: options } : options;
}

export async function awAlert(options: string | DialogOptions) {
  if (mountedApi) return mountedApi.alert(options);
  if (typeof window !== "undefined") window.alert(toOptions(options).message);
}

export async function awConfirm(options: string | DialogOptions) {
  if (mountedApi) return mountedApi.confirm(options);
  if (typeof window !== "undefined") return window.confirm(toOptions(options).message);
  return false;
}

export async function awPrompt(options: string | DialogOptions) {
  if (mountedApi) return mountedApi.prompt(options);
  const resolved = toOptions(options);
  if (typeof window !== "undefined") return window.prompt(resolved.message, resolved.defaultValue ?? "");
  return null;
}

export function useAwDialog() {
  const api = useContext(AwDialogContext);
  if (!api) {
    return {
      alert: awAlert,
      confirm: awConfirm,
      prompt: awPrompt,
    };
  }
  return api;
}

export function AwDialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const [draft, setDraft] = useState("");
  const nextIdRef = useRef(1);
  const active = queue[0] ?? null;

  const open = useCallback(<T,>(kind: DialogKind, options: string | DialogOptions) => {
    const resolved = toOptions(options);

    return new Promise<T>((resolve) => {
      const request: DialogRequest = {
        id: nextIdRef.current,
        kind,
        ...resolved,
        resolve: resolve as (value: unknown) => void,
      };

      nextIdRef.current += 1;
      setQueue((prev) => [...prev, request]);
    });
  }, []);

  const api = useMemo<AwDialogApi>(
    () => ({
      alert: async (options) => {
        await open<void>("alert", options);
      },
      confirm: (options) => open<boolean>("confirm", options),
      prompt: (options) => open<string | null>("prompt", options),
    }),
    [open]
  );

  useEffect(() => {
    mountedApi = api;
    return () => {
      if (mountedApi === api) mountedApi = null;
    };
  }, [api]);

  useEffect(() => {
    if (active?.kind !== "prompt") return;
    setDraft(active.defaultValue ?? "");
  }, [active?.id, active?.kind, active?.defaultValue]);

  useEffect(() => {
    if (!active) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWith(active.kind === "alert" ? undefined : active.kind === "confirm" ? false : null);
      }

      if (event.key === "Enter" && active.kind !== "prompt") {
        event.preventDefault();
        closeWith(active.kind === "confirm" ? true : undefined);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, active?.kind]);

  function closeWith(value: unknown) {
    const current = queue[0];
    if (!current) return;

    current.resolve(value);
    setQueue((prev) => prev.slice(1));
  }

  const title =
    active?.title ??
    (active?.kind === "confirm" ? "Potvrzení akce" : active?.kind === "prompt" ? "Doplň údaj" : "");
  const confirmLabel = active?.confirmLabel ?? (active?.kind === "alert" ? "OK" : active?.kind === "prompt" ? "Potvrdit" : "Ano");
  const cancelLabel = active?.cancelLabel ?? "Zrušit";
  const dialogTitleId = title ? "aw-dialog-title" : undefined;

  return (
    <AwDialogContext.Provider value={api}>
      {children}

      {active ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          aria-label={dialogTitleId ? undefined : active.message}
        >
          <div
            className={`w-full rounded-2xl bg-white shadow-2xl ${active.kind === "alert" ? "max-w-sm p-4" : "max-w-md p-5"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={title ? "space-y-2" : ""}>
              {title ? (
                <h2 id="aw-dialog-title" className="text-lg font-bold text-slate-950">
                  {title}
                </h2>
              ) : null}
              <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{active.message}</p>
            </div>

            {active.kind === "prompt" ? (
              <input
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    closeWith(draft);
                  }
                }}
                placeholder={active.placeholder}
                className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            ) : null}

            <div className={`${active.kind === "alert" ? "mt-4" : "mt-5"} flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`}>
              {active.kind !== "alert" ? (
                <AwButton variant="tertiary" onClick={() => closeWith(active.kind === "confirm" ? false : null)}>
                  {cancelLabel}
                </AwButton>
              ) : null}
              <AwButton
                variant="primary"
                onClick={() => closeWith(active.kind === "confirm" ? true : active.kind === "prompt" ? draft : undefined)}
              >
                {confirmLabel}
              </AwButton>
            </div>
          </div>
        </div>
      ) : null}
    </AwDialogContext.Provider>
  );
}
