import { teamProxy } from "@/shared/api/team-proxy";
export async function GET() { return teamProxy("/pro/partners"); }
export async function POST(request: Request) { return teamProxy("/pro/partners", request); }
