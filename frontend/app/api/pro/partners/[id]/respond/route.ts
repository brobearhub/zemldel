import { teamProxy } from "@/shared/api/team-proxy";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teamProxy(`/pro/partners/${encodeURIComponent(id)}/respond`, request);
}
