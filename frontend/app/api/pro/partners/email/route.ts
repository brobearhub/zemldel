import { teamProxy } from "@/shared/api/team-proxy";
export async function POST(request: Request) { return teamProxy("/pro/partners/email", request); }
