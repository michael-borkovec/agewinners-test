/**
 * Responsive image source helpers.
 * Builds browser-selectable candidates from stored thumbnail, feed, and detail variants.
 */

export type ResponsiveImageVariantUrls = {
  thumb?: string | null;
  medium?: string | null;
  detail?: string | null;
};

export type ResponsiveImageSources = {
  src: string;
  srcSet: string | undefined;
};

function cleanUrl(value: string | null | undefined) {
  return String(value ?? "").trim();
}

export function buildResponsiveImageSources(urls: ResponsiveImageVariantUrls): ResponsiveImageSources {
  const thumb = cleanUrl(urls.thumb);
  const medium = cleanUrl(urls.medium);
  const detail = cleanUrl(urls.detail);
  const candidates = [
    { url: thumb, width: 320 },
    { url: medium, width: 1024 },
    { url: detail, width: 1600 },
  ];
  const seen = new Set<string>();
  const srcSet = candidates
    .filter((candidate) => {
      if (!candidate.url || seen.has(candidate.url)) return false;
      seen.add(candidate.url);
      return true;
    })
    .map((candidate) => `${candidate.url} ${candidate.width}w`)
    .join(", ");

  return {
    src: medium || thumb || detail,
    srcSet: srcSet.includes(",") ? srcSet : undefined,
  };
}
