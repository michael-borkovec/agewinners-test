"use client";

/**
 * File purpose
 * - Reusable textarea with the same emoji picker controls used in messages.
 * - Adds toolbar or in-field emoji picker variants and typed shortcut normalization.
 * - Related APIs, components, or modules
 *   - lib/utils/emoji.ts
 *   - components/NewPostForm.tsx
 *   - app/profile/basic/page.tsx
 */

import { useEffect, useRef, useState } from "react";
import { BASIC_EMOJIS, normalizeTypedEmoji } from "@/lib/utils/emoji";

type EmojiTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
  panelClassName?: string;
  compact?: boolean;
  pickerVariant?: "toolbar" | "corner";
};

export default function EmojiTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled = false,
  className = "",
  panelClassName = "",
  compact = false,
  pickerVariant = "toolbar",
}: EmojiTextareaProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiActivityTick, setEmojiActivityTick] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const emojiButtonClass = compact ? "h-6 w-6 text-[13px]" : "h-9 w-9 text-base";
  const panelGridClass = compact ? "grid-cols-[repeat(auto-fill,minmax(28px,1fr))] gap-1" : "grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1.5";
  const panelWidthClass = compact ? "w-full sm:max-w-[360px]" : "w-full sm:max-w-[520px]";
  void pickerVariant;

  function insertEmoji(emoji: string) {
    setEmojiActivityTick((current) => current + 1);
    const textarea = textareaRef.current;

    if (!textarea) {
      onChange(`${value}${emoji}`);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${emoji}${value.slice(end)}`;

    onChange(nextValue);

    window.requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = start + emoji.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  useEffect(() => {
    if (!emojiOpen) return;

    const timeoutId = window.setTimeout(() => {
      setEmojiOpen(false);
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [emojiOpen, emojiActivityTick]);

  function renderEmojiPanel(positionClassName: string) {
    if (!emojiOpen) return null;

    return (
      <div className={`${positionClassName} z-20 grid ${panelWidthClass} ${panelGridClass} rounded-2xl bg-white p-2.5 shadow-lg`}>
        {BASIC_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => insertEmoji(emoji)}
            className={`flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 ${emojiButtonClass}`}
            disabled={disabled}
            aria-label={`Vložit emoji ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    );
  }

  function renderPickerButton() {
    return (
      <button
        type="button"
        aria-label={emojiOpen ? "Sbalit emoji" : "Zobrazit emoji"}
        title={emojiOpen ? "Sbalit emoji" : "Zobrazit emoji"}
        aria-expanded={emojiOpen}
        onClick={() => setEmojiOpen((current) => !current)}
        className={`absolute left-3 top-3 flex items-center justify-center rounded-md text-slate-950 hover:bg-slate-100 disabled:opacity-60 ${compact ? "h-6 w-6" : "h-7 w-7"}`}
        disabled={disabled}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={compact ? "h-5 w-5" : "h-6 w-6"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
          <path d="M8.5 10h.01" />
          <path d="M14.5 10h.01" />
          <path d="M8.4 14.2c1 .95 2.2 1.45 3.6 1.45s2.6-.5 3.6-1.45" />
          <path d="M18 5.2v4" />
          <path d="M16 7.2h4" />
        </svg>
      </button>
    );
  }

  return (
    <div className={`relative ${panelClassName}`.trim()}>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(normalizeTypedEmoji(e.target.value))}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          className={`${className} pl-12`.trim()}
        />

        {renderPickerButton()}
        {renderEmojiPanel("absolute left-0 top-full mt-2")}
      </div>
    </div>
  );
}

