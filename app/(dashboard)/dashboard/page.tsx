import { requireProfile } from "@/lib/auth";
import { EmployeeDashboard } from "./employee-dashboard";
import { ManagerDashboard } from "./manager-dashboard";
import { AdminDashboard } from "./admin-dashboard";

export default async function DashboardPage() {
  const profile = await requireProfile();
  if (profile.role === "admin") return <AdminDashboard profile={profile} />;
  if (profile.role === "manager") return <ManagerDashboard profile={profile} />;
  return <EmployeeDashboard profile={profile} />;
}
