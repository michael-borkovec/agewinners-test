/**
 * components/profile/EditableField.tsx
 *
 * Purpose:
 * - Reusable "read mode" + "edit mode" field with pencil icon.
 * - Designed for profile pages where users should SEE saved values first,
 *   then explicitly switch a field into edit mode.
 */

"use client";

import { useMemo } from "react";

type EditableFieldProps = {
  label: string;
  value: string | null | undefined;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;

  // Controlled input value when editing
  editValue: string;
  onChangeEditValue: (v: string) => void;

  placeholder?: string;
  multiline?: boolean;
};

export default function EditableField({
  label,
  value,
  isEditing,
  onStartEdit,
  onCancelEdit,
  editValue,
  onChangeEditValue,
  placeholder,
  multiline,
}: EditableFieldProps) {
  const displayValue = useMemo(() => {
    const v = (value ?? "").trim();
    return v.length ? v : "—";
  }, [value]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{label}</div>
          {!isEditing ? (
            <div className="mt-1 whitespace-pre-wrap text-slate-700">{displayValue}</div>
          ) : (
            <div className="mt-2">
              {multiline ? (
                <textarea
                  value={editValue}
                  onChange={(e) => onChangeEditValue(e.target.value)}
                  placeholder={placeholder}
                  className="min-h-[96px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              ) : (
                <input
                  value={editValue}
                  onChange={(e) => onChangeEditValue(e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              )}

              <button
                type="button"
                onClick={onCancelEdit}
                className="mt-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Zrušit úpravy
              </button>
            </div>
          )}
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={onStartEdit}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            aria-label={`Upravit поле: ${label}`}
            title="Upravit"
          >
            ✏️
          </button>
        ) : null}
      </div>
    </div>
  );
}
