import { Atom } from "lucide-react";
import { UpdatePasswordForm } from "./update-password-form";

export default function UpdatePasswordPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-2 text-lg font-semibold">
            <Atom className="h-5 w-5 text-primary" />
            AtomQuest
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a strong password to finish recovering your account.
          </p>
        </div>
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
