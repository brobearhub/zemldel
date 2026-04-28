import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { ChatThreeColumnLayout } from "@/widgets/chat/ui/ChatThreeColumnLayout";
import { ProfileSidebarNav } from "@/widgets/profile/ui/ProfileSidebarNav";

type CustomerContractInstanceListItem = {
  id: string;
  title: string;
  status: "DRAFT" | "SENT" | "SIGNED" | "CANCELLED";
  requestId: string | null;
  providerId: string;
  updatedAt: string;
  createdAt: string;
};

function statusLabel(status: CustomerContractInstanceListItem["status"]) {
  if (status === "SIGNED") return "Принят";
  if (status === "SENT") return "Отправлен";
  if (status === "CANCELLED") return "Отменён";
  return "Черновик";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type Props = { params: Promise<{ id: string }> };

export default async function CustomerRequestContractsPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/signin");

  let instances: CustomerContractInstanceListItem[];
  try {
    instances = await fetchBackendJsonAsUser<CustomerContractInstanceListItem[]>(`/contracts/requests/${id}/instances`, session.user.id);
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

            {instances.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography color="text.secondary">Провайдер ещё не подготовил договор.</Typography>
              </Paper>
            ) : (
              <Stack spacing={1.5}>
                {instances.map((c) => (
                  <Paper key={c.id} variant="outlined" sx={{ p: 2.5 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography fontWeight={800}>{c.title}</Typography>
                        <Chip size="small" label={statusLabel(c.status)} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Обновлён: {formatDate(c.updatedAt)}
                      </Typography>
                      <Box>
                        <Link href={`/profile/contracts/instances/${c.id}`} style={{ textDecoration: "none" }}>
                          <Button component="span" variant="contained">
                            Открыть
                          </Button>
                        </Link>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        }
        right={<></>}
        rightWidth={0}
      />
    </main>
  );
}

