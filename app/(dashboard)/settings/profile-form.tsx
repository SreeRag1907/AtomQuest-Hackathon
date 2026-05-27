"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "./actions";
import type { Profile } from "@/types/database";

const MAX_NAME = 100;
const MAX_DEPT = 80;

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name);
  const [department, setDepartment] = useState(profile.department ?? "");
  const [errors, setErrors] = useState<{ fullName?: string; department?: string }>({});
  const [isPending, startTransition] = useTransition();

  function validate(): boolean {
    const next: { fullName?: string; department?: string } = {};
    if (!fullName.trim()) {
      next.fullName = "Full name is required";
    } else if (fullName.trim().length < 2) {
      next.fullName = "Full name must be at least 2 characters";
    } else if (fullName.length > MAX_NAME) {
      next.fullName = `Keep it under ${MAX_NAME} characters`;
    }
    if (department.length > MAX_DEPT) {
      next.department = `Keep it under ${MAX_DEPT} characters`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    startTransition(async () => {
      const r = await updateProfile({
        full_name: fullName.trim(),
        department: department.trim() || null,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Profile update failed");
        return;
      }
      toast.success("Profile updated");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="profile-name">Full name</Label>
        <Input
          id="profile-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={MAX_NAME}
          aria-invalid={errors.fullName ? true : undefined}
          aria-describedby={errors.fullName ? "profile-name-error" : undefined}
        />
        {errors.fullName ? (
          <p id="profile-name-error" className="text-xs text-destructive" role="alert">
            {errors.fullName}
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-dept">Department</Label>
        <Input
          id="profile-dept"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          maxLength={MAX_DEPT}
          aria-invalid={errors.department ? true : undefined}
          aria-describedby={errors.department ? "profile-dept-error" : undefined}
        />
        {errors.department ? (
          <p id="profile-dept-error" className="text-xs text-destructive" role="alert">
            {errors.department}
          </p>
        ) : null}
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          Save changes
        </Button>
      </div>
    </form>
  );
}
