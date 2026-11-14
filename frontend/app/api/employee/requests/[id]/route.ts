import { teamProxy } from "@/shared/api/team-proxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return teamProxy(`/employee/requests/${id}`, request);
}
