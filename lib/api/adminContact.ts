/**
 * File purpose
 * - Send user help/contact messages to platform admins.
 * - Uses the messages subsystem through a dedicated Supabase RPC.
 * - Related APIs, components, or modules
 *   - app/help/page.tsx
 *   - supabase/migrations/20260417_admin_contact_messages.sql
 */

import { supabase } from "@/lib/supabaseClient";

export async function sendAdminContactMessage(body: string): Promise<number> {
  const cleanBody = body.trim();
  if (!cleanBody) throw new Error("Zpráva nesmí být prázdná.");

  const { data, error } = await supabase.rpc("send_admin_contact_message", {
    p_body: cleanBody,
  });

  if (error) {
    if (error.message?.includes("admin_not_found")) {
      throw new Error("Momentálně není dostupný žádný správce.");
    }
    throw new Error(error.message);
  }

  return Number(data ?? 0);
}
