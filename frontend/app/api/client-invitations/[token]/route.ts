import { teamProxy } from "@/shared/api/team-proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return teamProxy(`/client-invitations/${encodeURIComponent(token)}`, undefined, true);
}
