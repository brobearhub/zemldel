import { teamProxy } from "@/shared/api/team-proxy";

export async function GET(request: Request, { params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  return teamProxy(`/providers/${providerId}/members`, request);
}
export async function POST(request: Request, { params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  return teamProxy(`/providers/${providerId}/members`, request);
}
