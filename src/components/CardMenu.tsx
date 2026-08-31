import { useEffect, useRef, useState } from "react";
import "./CardMenu.css";

export interface CardMenuItem {
  label: string;
  onClick: () => void;
  /** Renders this item in the status-critical color, for delete-type actions. */
  destructive?: boolean;
}

/** A small "⋯" trigger that opens a compact action menu — used on cards
 * (categories, goals, debts, transactions) instead of a row of separate
 * colored text links, which gets cluttered fast once a card has more than
 * one or two actions. */
export function CardMenu({ items, label = "More actions" }: { items: CardMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="card-menu" ref={rootRef}>
      <button
        type="button"
        className="card-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="19" r="1.6" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="card-menu__panel" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={"card-menu__item" + (item.destructive ? " card-menu__item--destructive" : "")}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
