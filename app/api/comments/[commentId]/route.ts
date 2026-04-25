/**
 * File purpose
 * - Delete a comment when allowed by ownership rules.
 * Main responsibilities
 * - Allow deletion by the comment author or by the owner of the target post/photo.
 * - Perform the final DB update via service role after explicit permission checks.
 * Related APIs, components, or modules
 * - lib/api/comments.ts
 * - components/PostCard.tsx
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Neznámá chyba.";
}

export async function DELETE(_: Request, context: { params: Promise<{ commentId: string }> }) {
  const cookieStore = await cookies();
  const { commentId: commentIdRaw } = await context.params;
  const commentId = Number(commentIdRaw);

  if (!Number.isFinite(commentId) || commentId <= 0) {
    return NextResponse.json({ error: "bad_request_commentId" }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!auth?.user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const viewerUserId = auth.user.id;

  try {
    const admin = getSupabaseAdmin();

    const { data: comment, error: commentErr } = await admin
      .from("comments")
      .select("id, author_user_id, post_id, image_id, target_type, is_deleted")
      .eq("id", commentId)
      .maybeSingle();

    if (commentErr) {
      return NextResponse.json({ error: commentErr.message }, { status: 500 });
    }
    if (!comment || comment.is_deleted) {
      return NextResponse.json({ error: "comment_not_found" }, { status: 404 });
    }

    let canDelete = String(comment.author_user_id ?? "") === viewerUserId;

    if (!canDelete && comment.target_type === "image" && comment.image_id) {
      const { data: image, error: imageErr } = await admin
        .from("images")
        .select("uploader_user_id")
        .eq("id", comment.image_id)
        .maybeSingle();

      if (imageErr) return NextResponse.json({ error: imageErr.message }, { status: 500 });
      canDelete = String(image?.uploader_user_id ?? "") === viewerUserId;
    }

    if (!canDelete && comment.post_id) {
      const { data: post, error: postErr } = await admin
        .from("posts")
        .select("author_user_id")
        .eq("id", comment.post_id)
        .maybeSingle();

      if (postErr) return NextResponse.json({ error: postErr.message }, { status: 500 });
      canDelete = String(post?.author_user_id ?? "") === viewerUserId;
    }

    if (!canDelete) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { error: deleteErr } = await admin
      .from("comments")
      .update({
        is_deleted: true,
        body: "[smazáno autorem]",
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 500 });
  }
}
