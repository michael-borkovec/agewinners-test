/**
 * File purpose
 * - Render the low-priority experimental photo toggle.
 * Main responsibilities
 * - Keep the control visually quiet without a heavy section heading.
 * Related APIs, components, or modules
 * - components/EditImageModal.tsx
 */

"use client";

export default function AdvancedSection({
  checked,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <section className="border-t border-slate-200 pt-4">
      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
        />
        <span className="min-w-0">
          <span className="block font-medium text-slate-900">Experimentální fotka</span>
          <span className="mt-1 block text-xs text-slate-500">Fotka se nezapočítá do AW věku</span>
        </span>
      </label>
    </section>
  );
}
