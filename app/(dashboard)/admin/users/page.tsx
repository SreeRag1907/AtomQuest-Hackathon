import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { UsersTable } from "./users-table";
import { InviteButton } from "./invite-button";
import type { Profile } from "@/types/database";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  const managers = (profiles ?? []).filter((p: Profile) =>
    ["manager", "admin"].includes(p.role)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage roles, manager assignments, and invitations."
        actions={<InviteButton managers={managers} />}
      />
      <Card>
        <UsersTable profiles={(profiles ?? []) as Profile[]} managers={managers} />
      </Card>
    </div>
  );
}
