import { teamProxy } from "@/shared/api/team-proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ providerId: string; memberId: string }> },
) {
  const { providerId, memberId } = await params;
  return teamProxy(`/providers/${providerId}/members/${memberId}`, request);
}
