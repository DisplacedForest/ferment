"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Popover } from "radix-ui";

export interface ComboboxOption {
  label: string;
  value: string;
  group: string;
  description?: string;
}

interface SearchableComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyText?: string;
  allowCustom?: boolean;
  id?: string;
}

export function SearchableCombobox({
  value,
  onChange,
  options,
  placeholder,
  emptyText = "No matches",
  allowCustom = false,
  id,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Display label: find matching option or show raw value
  const selectedOption = options.find((o) => o.value === value);
  const displayValue = selectedOption?.label ?? value;

  // Filter options by search term
  const query = search.toLowerCase();
  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query) ||
          o.value.toLowerCase().includes(query) ||
          o.group.toLowerCase().includes(query) ||
          (o.description?.toLowerCase().includes(query) ?? false),
      )
    : options;

  // Group filtered options
  const groups: { group: string; items: ComboboxOption[] }[] = [];
  for (const opt of filtered) {
    let g = groups.find((gr) => gr.group === opt.group);
    if (!g) {
      g = { group: opt.group, items: [] };
      groups.push(g);
    }
    g.items.push(opt);
  }

  // Flat list for keyboard nav
  const flatItems: ComboboxOption[] = groups.flatMap((g) => g.items);
  const hasExactMatch = options.some(
    (o) => o.value.toLowerCase() === query || o.label.toLowerCase() === query,
  );
  const showCustom = allowCustom && search.trim() !== "" && !hasExactMatch;

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [search]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-combobox-item]");
    items[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const totalItems = flatItems.length + (showCustom ? 1 : 0);

  const select = useCallback(
    (val: string) => {
      onChange(val);
      setSearch("");
      setOpen(false);
    },
    [onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1 < totalItems ? i + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i > 0 ? i - 1 : totalItems - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < flatItems.length) {
          select(flatItems[activeIndex].value);
        } else if (showCustom && activeIndex === flatItems.length) {
          select(search.trim());
        } else if (showCustom && flatItems.length === 0) {
          select(search.trim());
        }
        break;
      case "Escape":
        e.preventDefault();
        setSearch("");
        setOpen(false);
        break;
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          value={open ? search : displayValue}
          placeholder={placeholder}
          className="w-full rounded-md border border-parchment-400 bg-parchment-50 px-3 py-2 text-sm text-wine-800 placeholder:text-parchment-400 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
          onFocus={() => {
            setSearch("");
            setOpen(true);
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-md border border-parchment-300/80 bg-parchment-50 shadow-[0_2px_8px_rgba(46,14,29,0.08)]"
        >
          <div
            ref={listRef}
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
          >
            {groups.map((g) => (
              <div key={g.group}>
                <div className="px-3 py-1.5 text-xs font-medium tracking-wide text-parchment-600">
                  {g.group}
                </div>
                {g.items.map((item) => {
                  const idx = flatItems.indexOf(item);
                  return (
                    <div
                      key={item.value}
                      data-combobox-item
                      role="option"
                      aria-selected={item.value === value}
                      className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-wine-800 ${
                        idx === activeIndex
                          ? "bg-parchment-200"
                          : "hover:bg-parchment-200"
                      }`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        select(item.value);
                      }}
                    >
                      <div className="min-w-0">
                        <div className="truncate">{item.label}</div>
                        {item.description && (
                          <div className="truncate text-xs text-parchment-600/80 font-mono">
                            {item.description}
                          </div>
                        )}
                      </div>
                      {item.value === value && (
                        <svg
                          className="ml-2 h-4 w-4 shrink-0 text-wine-500"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {flatItems.length === 0 && !showCustom && (
              <div className="px-3 py-4 text-center text-sm text-parchment-600/80">
                {emptyText}
              </div>
            )}

            {showCustom && (
              <div
                data-combobox-item
                role="option"
                aria-selected={false}
                className={`cursor-pointer px-3 py-2 text-sm text-wine-800 ${
                  activeIndex === flatItems.length
                    ? "bg-parchment-200"
                    : "hover:bg-parchment-200"
                }`}
                onMouseEnter={() => setActiveIndex(flatItems.length)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(search.trim());
                }}
              >
                Use &ldquo;{search.trim()}&rdquo; as custom
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
