import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface MenuDropdownProps {
  label: string;
  children: ReactNode;
}

export function MenuDropdown({ label, children }: MenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-0.5 rounded px-2.5 py-2 text-xs text-slate-300 md:px-2 md:py-1 transition hover:bg-slate-800 hover:text-white"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[11rem] rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function menuItemClass(disabled?: boolean) {
  return `flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-200 md:py-1.5 transition hover:bg-slate-800 disabled:opacity-40 ${
    disabled ? "cursor-not-allowed" : ""
  }`;
}
