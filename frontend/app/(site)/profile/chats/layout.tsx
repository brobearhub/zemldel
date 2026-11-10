import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Box } from "@mui/material";
import { getServerAuthSession } from "@/core/auth";
import { resolveAccountKind } from "@/core/auth/authorization";
import { ChatsWorkspace } from "@/widgets/chats/ui/ChatsWorkspace";

export default async function CustomerChatsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerAuthSession();
  if (!session?.user) {
    const requestHeaders = await headers();
    const returnTo = `${requestHeaders.get("x-pathname") ?? "/profile/chats"}${requestHeaders.get("x-search") ?? ""}`;
    redirect(`/signin?returnTo=${encodeURIComponent(returnTo)}`);
  }
  if (resolveAccountKind(session.user) === "PROVIDER") {
    redirect("/pro/chats");
  }
  return (
    <Box
      sx={{
        height: "100%",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: "100%",
        maxWidth: 1600,
        mx: "auto",
        px: {
          xs: 0,
          tablet: 3,
        },
      }}
    >
      {children}
      <ChatsWorkspace role="customer" />
    </Box>
  );
}
