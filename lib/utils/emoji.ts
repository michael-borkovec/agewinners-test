/**
 * File purpose
 * - Shared emoji presets and typed shortcut normalization for text inputs.
 * - Keeps composer behavior consistent across messages, posts, and profile bio.
 * - Related APIs, components, or modules
 *   - app/messages/page.tsx
 *   - components/EmojiTextarea.tsx
 */

export const BASIC_EMOJIS: readonly string[] = [
  "\u{1F642}",
  "\u{1F609}",
  "\u{1F44D}",
  "\u{1F600}",
  "\u{1F602}",
  "\u{1F923}",
  "\u{1F60D}",
  "\u{1F970}",
  "\u{1F618}",
  "\u{1F60A}",
  "\u{1F60E}",
  "\u{1F914}",
  "\u{1F917}",
  "\u{1F64C}",
  "\u{1F44F}",
  "\u{1F64F}",
  "\u{2764}\uFE0F",
  "\u{1F525}",
  "\u{1F389}",
  "\u{2728}",
  "\u{1F44C}",
  "\u{1F4AA}",
  "\u{1F648}",
  "\u{1F622}",
  "\u{1F62D}",
  "\u{1F62E}",
  "\u{1F621}",
  "\u{1F92F}",
  "\u{1F634}",
  "\u{1F440}",
] as const;

export const QUICK_REACTIONS: readonly string[] = ["\u{1F642}", "\u{1F609}", "\u{1F44D}"] as const;

export function normalizeTypedEmoji(text: string) {
  return text
    .replace(/(^|\s):-\)(?=\s|$)/g, "$1\u{1F642}")
    .replace(/(^|\s):\)(?=\s|$)/g, "$1\u{1F642}")
    .replace(/(^|\s);-\)(?=\s|$)/g, "$1\u{1F609}")
    .replace(/(^|\s);\)(?=\s|$)/g, "$1\u{1F609}")
    .replace(/(^|\s):-D(?=\s|$)/gi, "$1\u{1F600}")
    .replace(/(^|\s):D(?=\s|$)/g, "$1\u{1F600}")
    .replace(/(^|\s)LOL(?=\s|$)/gi, "$1\u{1F602}")
    .replace(/(^|\s)LMAO(?=\s|$)/gi, "$1\u{1F923}")
    .replace(/(^|\s)<3(?=\s|$)/g, "$1\u{2764}\uFE0F")
    .replace(/(^|\s):-\((?=\s|$)/g, "$1\u{1F622}")
    .replace(/(^|\s):\((?=\s|$)/g, "$1\u{1F622}")
    .replace(/(^|\s):-O(?=\s|$)/gi, "$1\u{1F62E}")
    .replace(/(^|\s):O(?=\s|$)/g, "$1\u{1F62E}")
    .replace(/(^|\s):P(?=\s|$)/gi, "$1\u{1F61B}")
    .replace(/(^|\s);P(?=\s|$)/gi, "$1\u{1F61C}");
}
