/**
 * File purpose
 * - Supabase Auth helpers for sign up, sign in, sign out, and password recovery.
 * - Sends mandatory registration metadata and the email confirmation redirect target.
 * - Related APIs, components, or modules
 *   - app/register/page.tsx
 *   - app/forgot-password/page.tsx
 *   - app/reset-password/page.tsx
 */

import { supabase } from "@/lib/supabaseClient";

const EMAIL_CONFIRM_REDIRECT =
  process.env.NEXT_PUBLIC_EMAIL_CONFIRM_REDIRECT ?? "http://localhost:3000/profile/basic";
const PASSWORD_RESET_REDIRECT =
  process.env.NEXT_PUBLIC_PASSWORD_RESET_REDIRECT ?? "http://localhost:3000/reset-password";

/**
 * Sign up with email + password + mandatory DOB.
 * DOB is stored in auth metadata so the backend can copy it into public.user_profiles.
 */
export async function signUpWithEmail(params: {
  email: string;
  password: string;
  dateOfBirth: string;
}): Promise<{ user: { id: string } | null }> {
  const { email, password, dateOfBirth } = params;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: EMAIL_CONFIRM_REDIRECT,
      data: {
        date_of_birth: dateOfBirth,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return { user: data.user ? { id: data.user.id } : null };
}

export async function signInWithEmail(params: { email: string; password: string }): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: PASSWORD_RESET_REDIRECT,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
