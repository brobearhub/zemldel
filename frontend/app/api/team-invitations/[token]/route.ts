import { teamProxy } from "@/shared/api/team-proxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  return teamProxy(`/provider-team-invitations/${token}`, request, true);
}
