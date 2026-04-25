/**
 * File purpose
 * - Build a recursive comment tree for image/post comment UIs.
 * Main responsibilities
 * - Group replies under their parent comment
 * - Preserve chronological order within roots and replies
 * Related APIs, components, or modules
 * - lib/api/comments.ts
 * - app/my-tips/page.tsx
 * - components/PostCard.tsx
 */

import type { CommentRow } from "@/lib/api/comments";

export type CommentNode = CommentRow & {
  replies: CommentNode[];
};

export function buildCommentTree(comments: CommentRow[]): CommentNode[] {
  const byId = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    byId.set(comment.id, {
      ...comment,
      replies: [],
    });
  }

  for (const comment of comments) {
    const node = byId.get(comment.id);
    if (!node) continue;

    const parentId = comment.parent_comment_id ?? null;
    if (parentId == null || parentId === comment.id) {
      roots.push(node);
      continue;
    }

    const parent = byId.get(parentId);
    if (!parent) {
      roots.push(node);
      continue;
    }

    parent.replies.push(node);
  }

  return roots;
}
