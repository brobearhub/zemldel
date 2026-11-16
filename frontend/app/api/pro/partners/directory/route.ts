import { teamProxy } from "@/shared/api/team-proxy";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  return teamProxy(`/pro/partners/directory?${query.toString()}`);
}
