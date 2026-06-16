import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { ChatThreeColumnLayout } from "@/widgets/chat/ui/ChatThreeColumnLayout";
import { ProfileSidebarNav } from "@/widgets/profile/ui/ProfileSidebarNav";
import {
  CustomerRequestContractFilesClient,
  type CustomerContractFileListItem,
} from "@/widgets/customer-contract-files/ui/CustomerRequestContractFilesClient";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerRequestContractsPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/signin");

  let files: CustomerContractFileListItem[];
  try {
    files = await fetchBackendJsonAsUser<CustomerContractFileListItem[]>(`/requests/mine/${id}/contract-files`, session.user.id);
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }

  return (
    <main>
      <ChatThreeColumnLayout
        left={<ProfileSidebarNav selected="requests" />}
        middle={
          <Stack spacing={2.5}>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={1}>
                <Typography variant="h5" fontWeight={900}>
                  Договоры по заявке
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Link href={`/profile/requests/${id}`} style={{ textDecoration: "none" }}>
                    <Button component="span" variant="outlined">
                      Назад к заявке
                    </Button>
                  </Link>
                </Stack>
              </Stack>
            </Paper>

            <CustomerRequestContractFilesClient requestId={id} initialFiles={files} />
          </Stack>
        }
        right={<></>}
        rightWidth={0}
      />
    </main>
  );
}

