/**
 * File: types/ui.ts
 *
 * Purpose:
 * - Shared UI-facing types (feed, posts, images)
 * - Some fields are optional by design (privacy).
 */

export type UiPostImage = {
  id: number;
  url: string;
  public_url?: string | null;
  public_url_medium?: string | null;
  public_url_thumb?: string | null;
  publicUrl?: string | null;
  publicUrlMedium?: string | null;
  publicUrlThumb?: string | null;
  storage_path_medium?: string | null;
  storage_path_thumb?: string | null;

  // Optional public metadata
  comment?: string | null;
  tags?: string[];
  challengeTags?: Array<{
    id: string;
    title: string;
    tag: string;
    visibility: "private" | "contacts" | "everyone";
  }>;
  contentRevealed?: boolean;
  viewerGuessedAge?: number | null;

  // 🔐 Sensitive statistics – ONLY for own posts
  real_age_years?: number | null;
  aw_age_image?: number | null;
  avg_guessed_age?: number | null;
  guesses_count?: number | null;
  comments_count?: number | null;
};

export type UiPost = {
  id: number;
  authorUserId: string;

  // ✅ Always a human name (display_name fallback)
  author: string;

  // optional avatar from profile
  authorAvatarUrl: string | null;
  identityRevealed?: boolean;
  contentRevealed?: boolean;

  subtitle?: string | null;
  time?: string | null;
  createdAt?: string | null;
  title?: string | null;
  text: string;

  images: UiPostImage[];
  story?: import("@/lib/api/postStories").PostStory | null;
  feedCardId?: string;
  sourcePostId?: number;
  sourcePostImageIds?: number[];
  isHiddenByViewer?: boolean;
};
