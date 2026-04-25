/**
 * File purpose
 * - Shared moderator/admin inbox for outreach and moderation messages to users.
 * - Related APIs, components, or modules
 *   - components/admin/StaffInbox
 */

import StaffInbox from "@/components/admin/StaffInbox";

export default function ModeratorMessagesPage() {
  return (
    <StaffInbox
      scope="moderator_outreach"
      title="Moderátor zprávy"
      description="Sdílený inbox pro komunikaci moderátorů a adminů s uživateli."
      navActive="moderator_messages"
    />
  );
}
