import { teamProxy } from "@/shared/api/team-proxy";

export async function GET(request: Request) {
  return teamProxy("/employee/requests", request);
}
