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

import { useRef, useState } from "react";
import { BASIC_EMOJIS, QUICK_REACTIONS, normalizeTypedEmoji } from "@/lib/utils/emoji";

const FREQUENT_PICKER_EMOJIS: readonly string[] = [
  ...QUICK_REACTIONS,
  "\u{1F600}",
  "\u{1F602}",
  "\u{1F923}",
  "\u{1F60D}",
] as const;

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const panelWidthClass = compact ? "w-[188px]" : "w-[280px]";
  const panelGridClass = compact ? "grid-cols-4 gap-1" : "grid-cols-5 gap-1.5";
  const emojiButtonClass = compact ? "h-6 w-6 text-[13px]" : "h-9 w-9 text-base";
  const plusButtonClass = compact ? "h-7 w-7" : "h-8 w-8";
  const plusIconClass = compact ? "h-5 w-5" : "h-6 w-6";
  const plusBadgeSvgClass = compact ? "h-[9px] w-[9px]" : "h-[10px] w-[10px]";
  const remainingEmojis = BASIC_EMOJIS.filter((emoji) => !FREQUENT_PICKER_EMOJIS.includes(emoji));
  const isCornerPicker = pickerVariant === "corner";

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current;

    if (!textarea) {
      onChange(`${value}${emoji}`);
      setEmojiOpen(false);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${emoji}${value.slice(end)}`;

    onChange(nextValue);
    setEmojiOpen(false);

    window.requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = start + emoji.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function renderEmojiPanel(positionClassName: string) {
    if (!emojiOpen) return null;

    return (
      <div className={`${positionClassName} z-10 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-lg`}>
        <div className={`flex ${panelWidthClass} flex-wrap gap-1.5 border-b border-slate-100 pb-2`}>
          {FREQUENT_PICKER_EMOJIS.map((emoji) => (
            <button
              key={`${emoji}-frequent`}
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

        <div className={`mt-2 grid ${panelWidthClass} ${panelGridClass}`}>
          {remainingEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => insertEmoji(emoji)}
              className={`flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-60 ${emojiButtonClass}`}
              disabled={disabled}
              aria-label={`Vložit emoji ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderPickerButton(buttonClassName: string) {
    return (
      <button
        type="button"
        aria-label="Zobrazit emoji"
        title="Zobrazit emoji"
        aria-expanded={emojiOpen}
        onClick={() => setEmojiOpen((current) => !current)}
        className={buttonClassName}
        disabled={disabled}
      >
        <span className={`relative leading-none ${plusIconClass}`}>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-full w-full text-slate-900"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="8.5" />
            <circle cx="9" cy="10" r="0.8" fill="currentColor" stroke="none" />
            <circle cx="15" cy="10" r="0.8" fill="currentColor" stroke="none" />
            <path d="M8.4 14.1c1 1.3 2.2 1.9 3.6 1.9s2.6-.6 3.6-1.9" />
          </svg>
          <svg
            viewBox="0 0 12 12"
            aria-hidden="true"
            className={`absolute right-[-2px] top-[-2px] text-slate-900 ${plusBadgeSvgClass}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M6 1.5v9" />
            <path d="M1.5 6h9" />
          </svg>
        </span>
      </button>
    );
  }

  if (!isCornerPicker) {
    return (
      <div className={`flex flex-col gap-3 ${panelClassName}`.trim()}>
        <div className="relative">
          {renderEmojiPanel("absolute bottom-full left-0 mb-2")}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(normalizeTypedEmoji(e.target.value))}
            rows={rows}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <div className="relative flex flex-wrap gap-2">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={`${emoji}-composer-quick`}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className={`flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 ${compact ? "h-6 min-w-6 px-1.5 text-[13px]" : "h-9 min-w-9 px-2.5 text-base"}`}
                  disabled={disabled}
                  aria-label={`Vložit emoji ${emoji}`}
                >
                  {emoji}
                </button>
              ))}

              {renderPickerButton(
                `flex items-center justify-center rounded-full border border-slate-900 bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-60 ${compact ? "h-6 min-w-6 px-1.5" : "h-9 min-w-9 px-2.5"}`
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${panelClassName}`.trim()}>
      <div className="relative">
        {renderEmojiPanel("absolute bottom-11 right-0")}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(normalizeTypedEmoji(e.target.value))}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          className={`${className} pr-12 pb-10`.trim()}
        />

        {renderPickerButton(
          `absolute bottom-2 right-2 flex items-center justify-center rounded-full bg-transparent text-slate-900 hover:bg-slate-100 disabled:opacity-60 ${plusButtonClass}`
        )}
      </div>
    </div>
  );
}
