/**
 * components/ProfilePhotoField.tsx
 *
 * Purpose:
 * - Profile photo uploader UI:
 *   - Shows current avatar preview (if any)
 *   - Allows selecting a new image file
 *   - Uploads to Supabase Storage and saves avatar_url to user_profiles
 */

"use client";

import { useRef, useState } from "react";
import AwButton from "@/components/AwButton";
import { uploadMyAvatar, removeMyAvatar } from "@/lib/api/userProfiles";

type ProfilePhotoFieldProps = {
  currentUrl: string | null | undefined;
  onUploaded: (newUrl: string) => void;
  onRemoved: () => void;
};

function unwrapOrThrow<T>(res: { data: T | null; errorMessage: string | null }): T {
  if (res.errorMessage) throw new Error(res.errorMessage);
  if (res.data === null || res.data === undefined) throw new Error("Neočekávaná prázdná odpověď serveru.");
  return res.data;
}

export default function ProfilePhotoField({ currentUrl, onUploaded, onRemoved }: ProfilePhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = "A";

  async function handleFilePicked(file: File) {
    setUploading(true);
    setError(null);
    try {
      const res = await uploadMyAvatar(file);
      const data = unwrapOrThrow(res);
      onUploaded(data.avatarUrl);
    } catch (e: any) {
      setError(e?.message ?? "Nepodařilo se nahrát profilovou fotku.");
    } finally {
      setUploading(false);
      // allow picking same file again
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setUploading(true);
    setError(null);
    try {
      const res = await removeMyAvatar();
      if (res.errorMessage) throw new Error(res.errorMessage);
      onRemoved();
    } catch (e: any) {
      setError(e?.message ?? "Nepodařilo se odebrat profilovou fotku.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-100">
            {currentUrl ? (
              <img
                src={currentUrl}
                alt="Profilová fotka"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-lg font-semibold text-slate-600">{initial}</span>
            )}
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">Profilová fotka</div>
            <div className="mt-1 text-sm text-slate-600">Nahraj JPG/PNG/WebP (max 5 MB).</div>

            {error && (
              <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFilePicked(file);
            }}
          />

          <AwButton variant="primary" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? "Nahrávám…" : currentUrl ? "Změnit fotku" : "Nahrát fotku"}
          </AwButton>

          {currentUrl && (
            <AwButton variant="tertiary" onClick={handleRemove} disabled={uploading}>
              Odebrat
            </AwButton>
          )}
        </div>
      </div>
    </div>
  );
}

