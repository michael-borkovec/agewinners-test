/**
 * File: components/AgeGuessSlider.tsx
 *
 * Purpose:
 * - Slider-based age guessing UI.
 * - Handles success vs error explicitly.
 * - Keeps the selected age visible after submit for the same photo.
 * - Locks submitted guesses for standard users.
 */

"use client";

import { useEffect, useRef, useState } from "react";

const MIN_GUESS_AGE = 16;
const MAX_GUESS_AGE = 116;

type AgeGuessSliderProps = {
  imageId: number;
  disabled?: boolean;
  initialAge?: number | null;
  lockAfterSubmit?: boolean;
  onSubmit: (imageId: number, age: number) => Promise<{ ok: boolean; message?: string }>;
};

function clampAge(value: number | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return MIN_GUESS_AGE;
  return Math.min(MAX_GUESS_AGE, Math.max(MIN_GUESS_AGE, Math.trunc(n)));
}

export default function AgeGuessSlider({
  imageId,
  disabled,
  initialAge,
  lockAfterSubmit = true,
  onSubmit,
}: AgeGuessSliderProps) {
  const [age, setAge] = useState(() => clampAge(initialAge));
  const [inputValue, setInputValue] = useState(() => String(clampAge(initialAge)));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(() => initialAge != null && lockAfterSubmit);
  const [hasExplicitAgeSelection, setHasExplicitAgeSelection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastImageIdRef = useRef(imageId);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (lastImageIdRef.current === imageId) return;
    lastImageIdRef.current = imageId;

    if (initialAge == null) {
      setAge(MIN_GUESS_AGE);
      setInputValue(String(MIN_GUESS_AGE));
      setSubmitted(false);
      setHasExplicitAgeSelection(false);
      setError(null);
      return;
    }

    const nextAge = clampAge(initialAge);
    setAge(nextAge);
    setInputValue(String(nextAge));
    setSubmitted(lockAfterSubmit);
    setHasExplicitAgeSelection(false);
    setError(null);
  }, [imageId, initialAge, lockAfterSubmit]);

  useEffect(() => {
    if (initialAge == null) return;

    const nextAge = clampAge(initialAge);
    setAge(nextAge);
    setInputValue(String(nextAge));
    setSubmitted(lockAfterSubmit);
    setHasExplicitAgeSelection(false);
    setError(null);
  }, [initialAge, lockAfterSubmit]);

  function setAgeEverywhere(nextAge: number) {
    const clamped = clampAge(nextAge);
    setAge(clamped);
    setInputValue(String(clamped));
  }

  function normalizeInput() {
    if (!inputValue.trim()) {
      setInputValue(String(age));
      return age;
    }

    const parsed = Number(inputValue);
    if (!Number.isFinite(parsed)) {
      setInputValue(String(age));
      return age;
    }

    const normalized = clampAge(parsed);
    setAgeEverywhere(normalized);
    return normalized;
  }

  function getCurrentSubmittedAge(ageOverride?: number) {
    if (typeof ageOverride === "number" && Number.isFinite(ageOverride)) {
      return clampAge(ageOverride);
    }

    const rawFromDom = inputRef.current?.value ?? inputValue;
    if (!rawFromDom.trim()) {
      return clampAge(age);
    }

    const parsed = Number(rawFromDom);
    if (!Number.isFinite(parsed)) {
      return clampAge(age);
    }

    return clampAge(parsed);
  }

  async function handleSubmit(ageOverride?: number) {
    if (submitting || submitted || !hasExplicitAgeSelection) return;

    const nextAge = getCurrentSubmittedAge(ageOverride);
    setSubmitting(true);
    setError(null);

    try {
      const res = await onSubmit(imageId, nextAge);

      if (!res.ok) {
        setError(res.message ?? "Tip se nepodařilo uložit.");
        return;
      }

      setAgeEverywhere(nextAge);

      if (lockAfterSubmit) {
        setSubmitted(true);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Neočekávaná chyba při ukládání tipu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (disabled) return null;

  const submitDisabled = submitting || submitted || !hasExplicitAgeSelection;
  const submitTitle = submitted
    ? "Tip odeslán"
    : !hasExplicitAgeSelection
      ? "Nejdříve zadej věk, který chceš tipovat"
      : "Potvrdit tip";
  const disabledFieldTitle = submitted ? "Už jsi tipoval" : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => {
            const nextRaw = e.target.value.replace(/[^\d]/g, "");
            setInputValue(nextRaw);
            setHasExplicitAgeSelection(true);

            if (!nextRaw) return;

            const parsed = Number(nextRaw);
            if (Number.isFinite(parsed) && parsed >= MIN_GUESS_AGE && parsed <= MAX_GUESS_AGE) {
              setAge(parsed);
            }
          }}
          onBlur={normalizeInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const normalized = normalizeInput();
              void handleSubmit(normalized);
            }
          }}
          disabled={submitting || submitted}
          title={disabledFieldTitle}
          className={`w-16 rounded-lg border px-2 py-1 text-center text-sm font-semibold outline-none ${
            submitted
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
              : "border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          }`}
          aria-label="Tipovaný věk"
        />

        <input
          type="range"
          min={MIN_GUESS_AGE}
          max={MAX_GUESS_AGE}
          value={age}
          onChange={(e) => {
            setHasExplicitAgeSelection(true);
            setAgeEverywhere(Number(e.target.value));
          }}
          disabled={submitting || submitted}
          title={disabledFieldTitle}
          className={`flex-1 ${submitted ? "cursor-not-allowed accent-slate-400 opacity-60" : "accent-[#32CD32]"}`}
        />

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitDisabled}
          className="shrink-0"
          title={submitTitle}
        >
          <img
            src="/icons/action/confirm-age-guess.svg"
            alt="Potvrdit tip"
            className={`h-6 w-6 transition ${submitDisabled ? "grayscale opacity-35" : "hover:scale-110"}`}
          />
        </button>
      </div>

      {error ? <div className="text-xs font-medium text-rose-600">{error}</div> : null}
    </div>
  );
}
