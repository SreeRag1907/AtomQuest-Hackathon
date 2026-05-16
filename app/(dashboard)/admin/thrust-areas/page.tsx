import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ThrustAreaForm, ThrustAreaToggle } from "./thrust-area-controls";
import type { ThrustArea } from "@/types/database";

export default async function AdminThrustAreasPage() {
  const supabase = await createClient();
  const { data: areas } = await supabase
    .from("thrust_areas")
    .select("*")
    .order("name");

  // count goals per thrust area
  const { data: counts } = await supabase
    .from("goals")
    .select("thrust_area_id");
  const usage: Record<string, number> = {};
  (counts ?? []).forEach((g) => {
    if (g.thrust_area_id) usage[g.thrust_area_id] = (usage[g.thrust_area_id] ?? 0) + 1;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thrust areas"
        description="High-level themes goals attach to. Used in reports and analytics."
        actions={<ThrustAreaForm />}
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Used by</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(areas ?? []).map((a: ThrustArea) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-md">
                  {a.description ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{usage[a.id] ?? 0}</TableCell>
                <TableCell>
                  {a.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}
                </TableCell>
                <TableCell>
                  <ThrustAreaToggle thrustArea={a} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
