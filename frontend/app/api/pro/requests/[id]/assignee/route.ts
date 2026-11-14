import { teamProxy } from "@/shared/api/team-proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return teamProxy(`/pro/requests/${id}/assignee`, request);
}
