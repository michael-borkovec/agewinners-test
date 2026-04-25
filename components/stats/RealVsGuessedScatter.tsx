/**
 * File purpose
 * - Render scatter chart comparing real age and AW age per photo
 * - Keep clickable photo detail modal for each point
 * - Apply tag and experimental-photo filters from stats page
 *
 * Related APIs, components, or modules
 * - lib/api/stats
 * - app/stats/page.tsx
 */

"use client";

import React from "react";
import HelpIconButton from "@/components/HelpIconButton";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";
import { getMyRealVsGuessedRows, type RealVsGuessedRawRow } from "@/lib/api/stats";

const CATEGORY_LABELS: Record<string, string> = {
  oblicej: "Obličej",
  cela_postava: "Celá postava",
  postava_bez_obliceje: "Postava bez obličeje",
  v_plavkach: "Plavky",
  makeup_stylizace: "Make-up",
  spolecenske_saty: "Společenské šaty",
  sport: "Sport",
};

const SCATTER_HELP_TEXT =
  "Graf porovnává skutečný věk na fotce s AW věkem, tedy tím, jak fotka působí podle tipů.\n\nKaždý zelený bod je jedna fotka. Čím níž je bod proti diagonále, tím mladší dojem fotka vyvolává. Čím výš je, tím starší dojem vyvolává.\n\nKliknutím na zelený bod otevřeš zvětšenou fotku a pod ní základní hodnoty: Věk, AW věk a AW skóre.";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function safeNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmt1(n: number | null, fallback = "—") {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return n.toFixed(1);
}

function fmtInt(n: number | null, fallback = "—") {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return String(Math.trunc(n));
}

function formatDateCZFull(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("cs-CZ");
}

function ymd(iso?: string | null): string {
  if (!iso) return "—";
  return String(iso).slice(0, 10);
}

function formatTag(value?: string | null): string {
  if (!value) return "—";
  return CATEGORY_LABELS[value] ?? value.replaceAll("_", " ");
}

function formatPhotoTags(row: RealVsGuessedRawRow): string {
  const tags = Array.isArray(row.tags) && row.tags.length > 0 ? row.tags : row.photo_category && row.photo_category !== "bezna" ? [row.photo_category] : [];
  if (tags.length === 0) return "—";
  return tags.map(formatTag).join(", ");
}

function pickAwAge(row: RealVsGuessedRawRow): number | null {
  const aw = safeNumber(row.aw_age_image);
  if (aw !== null) return aw;
  return safeNumber(row.avg_guessed_age);
}

function computeScorePct(realAge: number | null, awAge: number | null): number | null {
  if (typeof realAge !== "number" || !Number.isFinite(realAge) || realAge <= 0) return null;
  if (typeof awAge !== "number" || !Number.isFinite(awAge)) return null;
  return ((awAge - realAge) / realAge) * 100;
}

function buildTicks(min: number, max: number, count = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max <= min) return [min];

  const rawStep = (max - min) / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let niceStep = magnitude;
  if (normalized >= 5) niceStep = 5 * magnitude;
  else if (normalized >= 2) niceStep = 2 * magnitude;

  const start = Math.ceil(min / niceStep) * niceStep;
  const ticks: number[] = [];

  for (let v = start; v <= max + 0.0001; v += niceStep) {
    ticks.push(Number(v.toFixed(10)));
  }

  if (ticks.length === 0) ticks.push(min, max);
  return Array.from(new Set(ticks));
}

export default function RealVsGuessedScatter(props: { tags: string[]; includeExperimental: boolean }) {
  const { tags, includeExperimental } = props;
  const [rows, setRows] = React.useState<RealVsGuessedRawRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = React.useState(false);
  const [zoomRow, setZoomRow] = React.useState<RealVsGuessedRawRow | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await getMyRealVsGuessedRows({ tags, includeExperimental });
        if (cancelled) return;

        setRows(
          (result ?? []).filter(
            (x) =>
              typeof x?.id === "number" &&
              Number.isFinite(x.id) &&
              isFiniteNumber(x.real_age_years) &&
              (isFiniteNumber(x.avg_guessed_age) || isFiniteNumber(x.aw_age_image))
          )
        );
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Načtení grafu se nezdařilo.");
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tags, includeExperimental]);

  const data = rows.map((row, idx) => {
    const aw = pickAwAge(row);
    return {
      x: row.real_age_years,
      y: aw ?? row.avg_guessed_age,
      key: `img-${row.id}-${idx}`,
      tooltip: `Foto #${row.id} • ${ymd(row.taken_at)} • skutečný ${Number(row.real_age_years).toFixed(1)} / AW ${
        aw != null ? aw.toFixed(1) : "—"
      } (klik → zvětšit)`,
      imageId: row.id,
    };
  });

  function renderHeader() {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">Po jednotlivých fotkách</div>
        <HelpIconButton
          helpText={SCATTER_HELP_TEXT}
          modalTitle="Nápověda - po jednotlivých fotkách"
          className="shrink-0 p-1"
          iconClassName="h-4 w-4"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        {renderHeader()}
        <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-gray-600">Načítám graf…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        {renderHeader()}
        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        {renderHeader()}
        <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-gray-600">Zatím není co vykreslit.</div>
      </div>
    );
  }

  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const minX = Math.floor(Math.min(...xs) - 1);
  const maxX = Math.ceil(Math.max(...xs) + 1);
  const minY = Math.floor(Math.min(...ys) - 1);
  const maxY = Math.ceil(Math.max(...ys) + 1);
  const domainMin = clamp(Math.min(minX, minY), 0, 120);
  const domainMax = clamp(Math.max(maxX, maxY), 1, 120);

  const W = 820;
  const H = 420;
  const padLeft = 56;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 56;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  const sx = (x: number) => padLeft + ((x - domainMin) / (domainMax - domainMin)) * plotW;
  const sy = (y: number) => padTop + plotH - ((y - domainMin) / (domainMax - domainMin)) * plotH;
  const ticks = buildTicks(domainMin, domainMax, 6);

  function openZoomByImageId(imageId: number) {
    const row = rows.find((x) => Number(x.id) === Number(imageId)) ?? null;
    if (!row) return;
    const url = row.public_url ?? null;
    if (!url) return;
    setZoomRow(row);
    setZoomOpen(true);
  }

  const modalUrl = zoomRow ? zoomRow.public_url : null;
  const modalReal = zoomRow ? safeNumber(zoomRow.real_age_years) : null;
  const modalAw = zoomRow ? pickAwAge(zoomRow) : null;
  const modalScore = computeScorePct(modalReal, modalAw);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      {zoomOpen && zoomRow && modalUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Zvětšená fotka"
          onClick={() => {
            setZoomOpen(false);
            setZoomRow(null);
          }}
        >
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-3 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <CloseButton onClick={() => { setZoomOpen(false); setZoomRow(null); }} className="absolute right-2 top-2 bg-white/90 shadow hover:bg-white" />

            <img
              src={modalUrl}
              alt={`Fotka #${zoomRow.id}`}
              className="mx-auto max-h-[70vh] w-auto max-w-full rounded-xl object-contain"
              referrerPolicy="no-referrer"
            />

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-slate-50 p-2">
                <div className="font-semibold text-slate-600">Věk</div>
                <div className="text-slate-900">{fmtInt(modalReal)}</div>
              </div>

              <div className="rounded-xl bg-slate-50 p-2">
                <div className="font-semibold text-slate-600">AW věk</div>
                <div className="text-slate-900">{fmt1(modalAw)}</div>
              </div>

              <div className="rounded-xl bg-slate-50 p-2">
                <div className="font-semibold text-slate-600">AW skóre</div>
                <div className="text-slate-900">
                  {modalScore == null ? "—" : `${modalScore >= 0 ? "+" : ""}${modalScore.toFixed(1)} %`}
                </div>
              </div>
            </div>

            <div className="mt-2 text-center text-[11px] text-slate-500">
              Foto #{zoomRow.id} • {formatDateCZFull(zoomRow.taken_at)} • tagy: {formatPhotoTags(zoomRow)}
            </div>
          </div>
        </div>
      ) : null}

      {renderHeader()}

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full" role="img" aria-label="Real vs AW věk graf">
        {ticks.map((t) => (
          <g key={`grid-${t}`}>
            <line x1={sx(t)} y1={padTop} x2={sx(t)} y2={padTop + plotH} stroke="#e5e7eb" strokeWidth={1} />
            <line x1={padLeft} y1={sy(t)} x2={padLeft + plotW} y2={sy(t)} stroke="#e5e7eb" strokeWidth={1} />
          </g>
        ))}

        <line x1={padLeft} y1={padTop + plotH} x2={padLeft + plotW} y2={padTop + plotH} stroke="#94a3b8" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#94a3b8" />

        <line
          x1={sx(domainMin)}
          y1={sy(domainMin)}
          x2={sx(domainMax)}
          y2={sy(domainMax)}
          stroke="#111827"
          strokeWidth={1}
          opacity={0.45}
        />

        {ticks.map((t) => (
          <g key={`x-${t}`}>
            <line x1={sx(t)} y1={padTop + plotH} x2={sx(t)} y2={padTop + plotH + 6} stroke="#94a3b8" />
            <text x={sx(t)} y={padTop + plotH + 20} textAnchor="middle" fontSize="11" fill="#64748b">
              {t}
            </text>
          </g>
        ))}

        {ticks.map((t) => (
          <g key={`y-${t}`}>
            <line x1={padLeft - 6} y1={sy(t)} x2={padLeft} y2={sy(t)} stroke="#94a3b8" />
            <text x={padLeft - 10} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {t}
            </text>
          </g>
        ))}

        <text x={padLeft + plotW / 2} y={H - 10} textAnchor="middle" fontSize="12" fill="#475569">
          Věk (roky)
        </text>

        <text transform={`translate(16 ${padTop + plotH / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="#475569">
          AW věk / tipovaný věk (roky)
        </text>

        {data.map((d) => {
          const cx = sx(d.x);
          const cy = sy(d.y);

          return (
            <g
              key={d.key}
              onClick={() => openZoomByImageId(d.imageId)}
              style={{ cursor: "pointer" }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openZoomByImageId(d.imageId);
              }}
            >
              <title>{d.tooltip}</title>
              <circle cx={cx} cy={cy} r={10} fill="transparent" />
              <circle cx={cx} cy={cy} r={3.5} fill="#10b981" opacity={0.85} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
