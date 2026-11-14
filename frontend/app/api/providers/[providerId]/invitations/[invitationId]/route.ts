import { teamProxy } from "@/shared/api/team-proxy";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ providerId: string; invitationId: string }> },
) {
  const { providerId, invitationId } = await params;
  return teamProxy(
    `/providers/${providerId}/invitations/${invitationId}`,
    request,
  );
}
