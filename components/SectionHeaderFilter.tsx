/**
 * File: components/SectionHeaderFilter.tsx
 *
 * Purpose:
 * - Sticky header with section title, filter modal trigger, and refresh icon.
 * - Optional persistence of multiple filter groups via localStorage (storageKey).
 * - 3-column filter modal:
 *   - left = main filters
 *   - middle = extra filter groups
 *   - right = action buttons
 *
 * Behavior:
 * - committed value = [] means "show all" for each filter group
 * - modal draft visually supports:
 *   - show all
 *   - clear all checkboxes
 * - Sticky top offset uses CSS var --aw-topbar-h (set by AuthShell)
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";
import HelpIconButton from "@/components/HelpIconButton";

export type FilterOption = { key: string; label: string };

type HeaderAction = {
  iconPath: string;
  label: string;
  title?: string;
  onClick: () => void;
};

type StoredFilterState = {
  value?: string[];
  extraValue?: string[];
  extra2Value?: string[];
  selectValue?: string;
};

export function SectionHeaderFilter(props: {
  title: string;
  iconPath?: string;
  options: FilterOption[];
  mainTitle?: string;
  /** empty array = no filtering (show all) */
  value: string[];
  onChange: (next: string[]) => void;

  /** optional second group */
  extraTitle?: string;
  extraOptions?: FilterOption[];
  extraValue?: string[];
  onExtraChange?: (next: string[]) => void;
  extraEmptyMeansAll?: boolean;

  /** optional third group */
  extra2Title?: string;
  extra2Options?: FilterOption[];
  extra2Value?: string[];
  onExtra2Change?: (next: string[]) => void;

  /** optional single-choice select */
  selectTitle?: string;
  selectOptions?: FilterOption[];
  selectValue?: string;
  onSelectChange?: (next: string) => void;

  /** persist filter between refresh */
  storageKey?: string;

  /** UI options */
  showClearAll?: boolean;
  doneButtonClassName?: string;
  onRefresh?: () => void | Promise<void>;
  beforeFilterAction?: HeaderAction;
  helpText?: string;
  refreshIconPath?: string;
  refreshActiveIconPath?: string;
  refreshActiveDurationMs?: number;
  refreshAnimationStorageKey?: string;
}) {
  const {
    title,
    iconPath,
    options,
    mainTitle,
    value,
    onChange,
    extraTitle,
    extraOptions = [],
    extraValue = [],
    onExtraChange,
    extraEmptyMeansAll = true,
    extra2Title,
    extra2Options = [],
    extra2Value = [],
    onExtra2Change,
    selectTitle,
    selectOptions = [],
    selectValue = "",
    onSelectChange,
    storageKey,
    showClearAll,
    doneButtonClassName,
    onRefresh,
    beforeFilterAction,
    helpText,
    refreshIconPath = "/refresh.ico",
    refreshActiveIconPath,
    refreshActiveDurationMs = 3000,
    refreshAnimationStorageKey,
  } = props;

  const [open, setOpen] = useState(false);
  const [refreshAnimating, setRefreshAnimating] = useState(false);

  useEffect(() => {
    if (!refreshActiveIconPath || !refreshAnimationStorageKey) return;

    try {
      const raw = window.sessionStorage.getItem(refreshAnimationStorageKey);
      if (!raw) return;

      window.sessionStorage.removeItem(refreshAnimationStorageKey);

      const startedAt = Number(raw);
      if (!Number.isFinite(startedAt)) return;

      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs >= refreshActiveDurationMs) return;

      setRefreshAnimating(true);
      const timeoutId = window.setTimeout(() => {
        setRefreshAnimating(false);
      }, Math.max(0, refreshActiveDurationMs - elapsedMs));

      return () => window.clearTimeout(timeoutId);
    } catch {
      // ignore
    }
  }, [refreshActiveDurationMs, refreshActiveIconPath, refreshAnimationStorageKey]);

  useEffect(() => {
    if (!refreshAnimating) return;

    const timeoutId = window.setTimeout(() => {
      setRefreshAnimating(false);
    }, refreshActiveDurationMs);

    return () => window.clearTimeout(timeoutId);
  }, [refreshAnimating, refreshActiveDurationMs]);

  useEffect(() => {
    if (!storageKey) return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        onChange(parsed.map(String));
        return;
      }

      const obj = (parsed ?? {}) as StoredFilterState;

      if (Array.isArray(obj.value)) onChange(obj.value.map(String));
      if (Array.isArray(obj.extraValue) && onExtraChange) onExtraChange(obj.extraValue.map(String));
      if (Array.isArray(obj.extra2Value) && onExtra2Change) onExtra2Change(obj.extra2Value.map(String));
      if (typeof obj.selectValue === "string" && onSelectChange) onSelectChange(obj.selectValue);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;

    try {
      const payload: StoredFilterState = {
        value,
        extraValue,
        extra2Value,
        selectValue,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [storageKey, value, extraValue, extra2Value, selectValue]);

  const isMainActive = value.length > 0 && value.length < options.length;
  const isExtraActive = extraOptions.length > 0 && extraValue.length > 0 && (extraEmptyMeansAll ? extraValue.length < extraOptions.length : true);
  const isExtra2Active =
    extra2Options.length > 0 &&
    extra2Value.length > 0 &&
    !(extra2Value.length === 1 && extra2Value[0] === "vsechny") &&
    extra2Value.length < extra2Options.length;

  const isActive = isMainActive || isExtraActive || isExtra2Active;
  const defaultSelectKey = selectOptions[0]?.key ?? "";
  const isSelectActive = selectOptions.length > 0 && !!selectValue && selectValue !== defaultSelectKey;
  const hasActiveState = isActive || isSelectActive;
  const currentRefreshIconPath = refreshAnimating && refreshActiveIconPath ? refreshActiveIconPath : refreshIconPath;

  function handleRefreshClick() {
    if (refreshActiveIconPath && onRefresh) {
      setRefreshAnimating(true);
    }

    if (refreshActiveIconPath && refreshAnimationStorageKey) {
      try {
        window.sessionStorage.setItem(refreshAnimationStorageKey, String(Date.now()));
      } catch {
        // ignore
      }
    }

    if (onRefresh) {
      void onRefresh();
      return;
    }

    window.location.reload();
  }

  const summary = useMemo(() => {
    const parts: string[] = [];

    if (isMainActive) {
      const map = new Map(options.map((o) => [o.key, o.label]));
      parts.push(...value.map((k) => map.get(k) ?? k));
    }

    if (isExtraActive) {
      const map = new Map(extraOptions.map((o) => [o.key, o.label]));
      parts.push(...extraValue.map((k) => map.get(k) ?? k));
    }

    if (isExtra2Active) {
      const map = new Map(extra2Options.map((o) => [o.key, o.label]));
      parts.push(...extra2Value.map((k) => map.get(k) ?? k));
    }

    if (isSelectActive) {
      const map = new Map(selectOptions.map((o) => [o.key, o.label]));
      parts.push(map.get(selectValue) ?? selectValue);
    }

    return parts.join(", ");
  }, [isMainActive, isExtraActive, isExtra2Active, isSelectActive, options, value, extraOptions, extraValue, extra2Options, extra2Value, selectOptions, selectValue]);

  return (
    <>
      <div className="fixed left-[132px] top-[68px] z-[60] sm:hidden">
        <div className="flex items-center gap-2 rounded-sm bg-white/80 px-1 py-0.5">
          {helpText ? <HelpIconButton helpText={helpText} iconClassName="h-3.5 w-3.5" className="p-1" modalTitle={`Nápověda – ${title}`} /> : null}

          {beforeFilterAction ? (
            <button
              type="button"
              onClick={beforeFilterAction.onClick}
              className="rounded-md p-1 hover:bg-slate-100"
              aria-label={beforeFilterAction.label}
              title={beforeFilterAction.title ?? beforeFilterAction.label}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beforeFilterAction.iconPath} alt={beforeFilterAction.label} className="h-3.5 w-3.5" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md p-1 hover:bg-slate-100"
            aria-label="Filtrovat"
            title="Filtrovat"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hasActiveState ? "/funnel-full.ico" : "/funnel-empty.ico"} alt="" className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleRefreshClick}
            className="rounded-md p-1 hover:bg-slate-100"
            aria-label="Refresh"
            title="Refresh"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentRefreshIconPath} alt="" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="hidden sticky z-40 bg-white/95 backdrop-blur sm:block" style={{ top: "var(--aw-topbar-h, 0px)" }}>
        <div className="flex w-full items-center justify-between gap-3 p-4">
          <div className="min-w-0 hidden sm:block">
            <div className="flex items-center gap-3">
              {iconPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={iconPath} alt="" className="h-[2.1em] w-[2.1em] shrink-0" />
              ) : null}
              <div className="text-[1.46rem] font-semibold leading-tight">
                {title}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2 sm:flex-1">
            <div className="min-w-0 flex-1 truncate text-right text-sm text-slate-500 hidden sm:block">{summary}</div>

            {helpText ? <HelpIconButton helpText={helpText} modalTitle={`Nápověda – ${title}`} /> : null}

            {beforeFilterAction ? (
              <button
                type="button"
                onClick={beforeFilterAction.onClick}
                className="rounded-md p-2 hover:bg-slate-100"
                aria-label={beforeFilterAction.label}
                title={beforeFilterAction.title ?? beforeFilterAction.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={beforeFilterAction.iconPath} alt={beforeFilterAction.label} className="h-5 w-5" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-md p-2 hover:bg-slate-100"
              aria-label="Filtrovat"
              title="Filtrovat"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hasActiveState ? "/funnel-full.ico" : "/funnel-empty.ico"} alt="" className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleRefreshClick}
              className="rounded-md p-2 hover:bg-slate-100"
              aria-label="Refresh"
              title="Refresh"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentRefreshIconPath} alt="" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <FilterModal
          title={`Filtrace – ${title}`}
          options={options}
          mainTitle={mainTitle}
          value={value}
          onChange={onChange}
          extraTitle={extraTitle}
          extraOptions={extraOptions}
          extraValue={extraValue}
          onExtraChange={onExtraChange}
          extraEmptyMeansAll={extraEmptyMeansAll}
          extra2Title={extra2Title}
          extra2Options={extra2Options}
          extra2Value={extra2Value}
          onExtra2Change={onExtra2Change}
          selectTitle={selectTitle}
          selectOptions={selectOptions}
          selectValue={selectValue}
          onSelectChange={onSelectChange}
          onClose={() => setOpen(false)}
          showClearAll={showClearAll}
          doneButtonClassName={doneButtonClassName}
        />
      ) : null}
    </>
  );
}

function FilterModal(props: {
  title: string;
  options: FilterOption[];
  mainTitle?: string;
  value: string[];
  onChange: (next: string[]) => void;

  extraTitle?: string;
  extraOptions?: FilterOption[];
  extraValue?: string[];
  onExtraChange?: (next: string[]) => void;
  extraEmptyMeansAll?: boolean;

  extra2Title?: string;
  extra2Options?: FilterOption[];
  extra2Value?: string[];
  onExtra2Change?: (next: string[]) => void;

  selectTitle?: string;
  selectOptions?: FilterOption[];
  selectValue?: string;
  onSelectChange?: (next: string) => void;

  onClose: () => void;
  showClearAll?: boolean;
  doneButtonClassName?: string;
}) {
  const {
    title,
    options,
    mainTitle,
    value,
    onChange,
    extraTitle,
    extraOptions = [],
    extraValue = [],
    onExtraChange,
    extraEmptyMeansAll = true,
    extra2Title,
    extra2Options = [],
    extra2Value = [],
    onExtra2Change,
    selectTitle,
    selectOptions = [],
    selectValue = "",
    onSelectChange,
    onClose,
    showClearAll,
    doneButtonClassName,
  } = props;

  const allMainKeys = useMemo(() => options.map((o) => o.key), [options]);
  const allExtraKeys = useMemo(() => extraOptions.map((o) => o.key), [extraOptions]);
  const [draftMain, setDraftMain] = useState<string[]>(() => (value.length === 0 ? allMainKeys : value));
  const [draftExtra, setDraftExtra] = useState<string[]>(() => (extraEmptyMeansAll && extraValue.length === 0 ? allExtraKeys : extraValue));
  const [draftExtra2, setDraftExtra2] = useState<string[]>(() => {
    if (extra2Options.length === 0) return [];
    if (extra2Value.length === 0) return ["vsechny"];
    return extra2Value;
  });
  const [draftSelect, setDraftSelect] = useState<string>(selectValue);

  useEffect(() => {
    setDraftMain(value.length === 0 ? allMainKeys : value);
  }, [value, allMainKeys]);

  useEffect(() => {
    setDraftExtra(extraEmptyMeansAll && extraValue.length === 0 ? allExtraKeys : extraValue);
  }, [extraValue, allExtraKeys, extraEmptyMeansAll]);

  useEffect(() => {
    if (extra2Options.length === 0) {
      setDraftExtra2([]);
      return;
    }
    setDraftExtra2(extra2Value.length === 0 ? ["vsechny"] : extra2Value);
  }, [extra2Value, extra2Options.length]);

  useEffect(() => {
    setDraftSelect(selectValue);
  }, [selectValue]);

  function toggleInList(list: string[], key: string) {
    return list.includes(key) ? list.filter((x) => x !== key) : [...list, key];
  }

  function normalizeAllSelected(list: string[], allKeys: string[]) {
    const unique = Array.from(new Set(list));
    if (allKeys.length > 0 && unique.length === allKeys.length && allKeys.every((k) => unique.includes(k))) {
      return [];
    }
    return unique;
  }

  function handleDone() {
    onChange(normalizeAllSelected(draftMain, allMainKeys));

    if (onExtraChange) {
      onExtraChange(extraEmptyMeansAll ? normalizeAllSelected(draftExtra, allExtraKeys) : Array.from(new Set(draftExtra)));
    }

    if (onExtra2Change) {
      const cleaned = draftExtra2.filter((x) => x !== "vsechny");
      onExtra2Change(cleaned.length === 0 ? [] : Array.from(new Set(cleaned)));
    }

    if (onSelectChange) {
      onSelectChange(draftSelect);
    }

    onClose();
  }

  function handleShowAll() {
    setDraftMain(allMainKeys);
    setDraftExtra(allExtraKeys);
    setDraftExtra2(extra2Options.length > 0 ? ["vsechny"] : []);
  }

  function handleClearAll() {
    setDraftMain([]);
    setDraftExtra([]);
    setDraftExtra2([]);
  }

  function toggleMain(key: string) {
    setDraftMain((prev) => toggleInList(prev, key));
  }

  function toggleExtra(key: string) {
    setDraftExtra((prev) => toggleInList(prev, key));
  }

  function toggleExtra2(key: string) {
    setDraftExtra2((prev) => {
      if (key === "vsechny") {
        return prev.includes("vsechny") ? [] : ["vsechny"];
      }

      const next = toggleInList(prev.filter((x) => x !== "vsechny"), key);
      return Array.from(new Set(next));
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-4 shadow-lg md:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <CloseButton type="button" onClick={onClose} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-[1fr_1fr_220px]">
          <div>
            <div className="mb-3 text-sm font-semibold text-slate-900">{mainTitle ?? "Kategorie"}</div>

            <div className="space-y-2">
              {options.map((o) => (
                <label key={o.key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={draftMain.includes(o.key)} onChange={() => toggleMain(o.key)} />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <AwButton type="button" onClick={handleShowAll} variant="secondary">
                Zobrazit vše
              </AwButton>

              {showClearAll ? (
                <AwButton type="button" onClick={handleClearAll} variant="tertiary">
                  Odznačit vše
                </AwButton>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            {extraOptions.length > 0 ? (
              <div>
                <div className="mb-3 text-sm font-semibold text-slate-900">{extraTitle ?? "Další filtr"}</div>

                <div className="space-y-2">
                  {extraOptions.map((o) => (
                    <label key={o.key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={draftExtra.includes(o.key)} onChange={() => toggleExtra(o.key)} />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {extra2Options.length > 0 ? (
              <div>
                <div className="mb-3 text-sm font-semibold text-slate-900">{extra2Title ?? "Další filtr"}</div>

                <div className="space-y-2">
                  {extra2Options.map((o) => (
                    <label key={o.key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={draftExtra2.includes(o.key)} onChange={() => toggleExtra2(o.key)} />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {selectOptions.length > 0 ? (
              <div>
                <div className="mb-3 text-sm font-semibold text-slate-900">{selectTitle ?? "Výběr"}</div>
                <select
                  value={draftSelect}
                  onChange={(e) => setDraftSelect(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  {selectOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 md:justify-start">
            <AwButton
              type="button"
              onClick={handleDone}
              variant="primary"
              className={doneButtonClassName}
            >
              Hotovo
            </AwButton>

            <AwButton
              type="button"
              onClick={onClose}
              variant="tertiary"
            >
              Zavřít
            </AwButton>
          </div>
        </div>
      </div>
    </div>
  );
}

