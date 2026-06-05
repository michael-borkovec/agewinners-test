// app/profile/components/UserProfileForm.tsx
// Popis: Generický formulář pro úpravu uživatelského profilu podle konfiguračního schema.

'use client';

import React, { useState } from 'react';
import { awAlert } from '@/components/AwDialog';
import { PROFILE_FIELDS } from '@/lib/profileSchema';
import { UserProfile, ProfileSectionId, ProfileField } from '@/types/profile';

type UserProfileFormProps = {
  visibleSection: ProfileSectionId;
  initialData?: UserProfile;
  onSave?: (data: UserProfile) => void;
};

const emptyProfile: UserProfile = {};

export const UserProfileForm: React.FC<UserProfileFormProps> = ({
  visibleSection,
  initialData,
  onSave,
}) => {
  // Lokální stav profilu – později nahradíme daty z backendu (Supabase).
  const [formData, setFormData] = useState<UserProfile>(initialData || emptyProfile);

  const fieldsForSection: ProfileField[] = PROFILE_FIELDS.filter(
    (field) => field.section === visibleSection,
  );

  const handleChange = (field: ProfileField, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field.id]: value,
    }));
  };

  const handleCheckboxMulti = (field: ProfileField, optionValue: string) => {
    const prev = (formData[field.id] as string[] | undefined) || [];
    const exists = prev.includes(optionValue);
    const next = exists ? prev.filter((v) => v !== optionValue) : [...prev, optionValue];
    setFormData((prevState) => ({
      ...prevState,
      [field.id]: next,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: sem napojíme volání API (Supabase) pro uložení profilu.
    console.log('Saving profile data:', formData);
    if (onSave) onSave(formData);
    void awAlert('Profil uložen (zatím jen lokálně).');
  };

  if (fieldsForSection.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        V této sekci zatím nemáme žádná upravitelná pole. 💡
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fieldsForSection.map((field) => (
        <div key={field.id as string} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-800">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {renderInput(field, formData, handleChange, handleCheckboxMulti)}

          {field.helperText && (
            <p className="text-xs text-gray-500">{field.helperText}</p>
          )}
        </div>
      ))}

      <button
        type="submit"
        className="mt-2 inline-flex items-center justify-center rounded-xl bg-[#32CD32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#32CD32] transition"
      >
        Uložit změny
      </button>
    </form>
  );
};

function renderInput(
  field: ProfileField,
  formData: UserProfile,
  onChange: (field: ProfileField, value: any) => void,
  onToggleMulti: (field: ProfileField, optionValue: string) => void,
) {
  const value = formData[field.id];

  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={(value as string) || ''}
          onChange={(e) => onChange(field, e.target.value)}
        />
      );
    case 'textarea':
      return (
        <textarea
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          rows={3}
          value={(value as string) || ''}
          onChange={(e) => onChange(field, e.target.value)}
        />
      );
    case 'select':
      return (
        <select
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={(value as string) || ''}
          onChange={(e) => onChange(field, e.target.value)}
        >
          <option value="">-- vyber --</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case 'multiselect':
      return (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((opt) => {
            const arr = (value as string[] | undefined) || [];
            const checked = arr.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggleMulti(field, opt.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  checked
                    ? 'bg-[#32CD32] text-white border-emerald-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    case 'number':
      return (
        <input
          type="number"
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={value !== undefined ? String(value) : ''}
          onChange={(e) => onChange(field, Number(e.target.value))}
        />
      );
    case 'checkbox':
      return (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
          checked={Boolean(value)}
          onChange={(e) => onChange(field, e.target.checked)}
        />
      );
    case 'date':
      return (
        <input
          type="date"
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={(value as string) || ''}
          onChange={(e) => onChange(field, e.target.value)}
        />
      );
    default:
      return null;
  }
}

