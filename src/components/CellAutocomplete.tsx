import { forwardRef, useEffect, useRef, useState, type KeyboardEvent } from "react";

interface Props {
  value: string;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  /** Si es true, al enfocar se listan sugerencias aunque el campo esté vacío. */
  showOnFocus?: boolean;
  onChange: (value: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export const CellAutocomplete = forwardRef<HTMLInputElement, Props>(function CellAutocomplete(
  { value, suggestions, placeholder, className, showOnFocus = false, onChange, onKeyDown },
  ref
) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const query = value;
  const q = query.trim();
  const minChars = showOnFocus ? 0 : 2;
  const filteredOptions = suggestions
    .filter((item) => {
      if (item.toLowerCase() === q.toLowerCase()) return false;
      if (q.length < minChars) return false;
      if (!q) return true;
      return item.toLowerCase().includes(q.toLowerCase());
    })
    .slice(0, 12);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={ref}
        type="text"
        value={query}
        placeholder={placeholder}
        className={className}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 150);
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="scrollbar-dark absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
          {filteredOptions.map((item) => (
            <button
              key={item}
              type="button"
              className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(item);
                setIsOpen(false);
              }}
            >
              <span>{item}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
