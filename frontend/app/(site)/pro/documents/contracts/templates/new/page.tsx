import { redirect } from "next/navigation";
import { Stack } from "@mui/material";
import { getServerAuthSession } from "@/lib/auth";
import { ProfessionalWorkspacePanel } from "@/widgets/pro-dashboard/ui/ProfessionalWorkspacePanel";
import { ProContractTemplateEditor } from "@/widgets/pro-contracts/ui/ProContractTemplateEditor";

export default async function ProContractTemplateCreatePage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/signin");
  if ((session.user.memberships?.length ?? 0) === 0) {
    return (
      <Stack spacing={3}>
        <ProfessionalWorkspacePanel />
      </Stack>
    );
  }

  return <ProContractTemplateEditor mode="create" />;
}

