import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type InstallState =
  /** Ya está instalada / se abrió desde el icono, o es la app de escritorio. */
  | "installed"
  /** El navegador permite instalar con un clic (Chrome, Edge, Android...). */
  | "promptable"
  /** iPhone / iPad (Safari): hay que usar «Compartir → Añadir a inicio». */
  | "ios"
  /** El navegador no ofrece instalación ahora mismo. */
  | "unavailable";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadOs;
}

/** Guarda el evento de instalación a nivel módulo: puede dispararse antes de que React monte. */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== "undefined" && !isTauri()) {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installedFlag = true;
    notify();
  });
}

function computeState(): InstallState {
  if (isTauri() || installedFlag || isStandalone()) return "installed";
  if (deferredPrompt) return "promptable";
  if (isIos()) return "ios";
  return "unavailable";
}

export function useInstallPrompt() {
  const [state, setState] = useState<InstallState>(computeState);

  useEffect(() => {
    const sync = () => setState(computeState());
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  /** Lanza el diálogo nativo de instalación. Devuelve true si el usuario aceptó. */
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    const promptEvent = deferredPrompt;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    deferredPrompt = null;
    notify();
    return choice.outcome === "accepted";
  }, []);

  return { state, install };
}
