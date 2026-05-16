import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { ThemePreference } from "./theme-preference";

export default async function SettingsPage() {
  const profile = await requireProfile();
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Profile and personal preferences." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemePreference />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="text-muted-foreground">Email</div>
          <div className="font-medium">{profile.email}</div>
          <div className="mt-3 text-muted-foreground">Role</div>
          <div className="font-medium capitalize">{profile.role}</div>
        </CardContent>
      </Card>
    </div>
  );
}
