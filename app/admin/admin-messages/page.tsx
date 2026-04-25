/**
 * File purpose
 * - Shared admin inbox for messages sent directly to platform admins.
 * - Related APIs, components, or modules
 *   - components/admin/StaffInbox
 */

import StaffInbox from "@/components/admin/StaffInbox";

export default function AdminMessagesPage() {
  return (
    <StaffInbox
      scope="admin_support"
      title="Admin zprávy"
      description="Sdílený inbox pro zprávy, které uživatelé posílají přímo správcům."
      navActive="admin_messages"
    />
  );
}
