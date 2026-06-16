import type { ReactNode } from "react";
import { Box, Container } from "@mui/material";
import { forbidden, redirect } from "next/navigation";
import { Header } from "@/widgets/header/ui";
import { Footer } from "@/widgets/footer/ui/Footer";
import { AdminSidebar } from "@/widgets/admin-sidebar";
import { getServerAuthSession } from "@/core/auth";

interface Props {
  readonly children: ReactNode;
}

export default async function AdminLayout({ children }: Props) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/signin");
  }
  if (session.user.systemRole !== "PLATFORM_ADMIN") {
    forbidden();
  }
  const SIDEBAR_W = 280;
  const HEADER_H = 82;

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Header />

      {/* Desktop: sidebar pinned to viewport left */}
      <Box
        component="aside"
        sx={{
          display: { xs: "none", md: "block" },
          position: "fixed",
          left: 0,
          top: `${HEADER_H}px`,
          width: SIDEBAR_W,
          height: `calc(100dvh - ${HEADER_H}px)`,
          p: 2,
          overflow: "auto",
          bgcolor: "background.default",
          borderRight: "1px solid",
          borderColor: "divider",
          // must be serializable in a Server Component (no functions)
          zIndex: 1099,
        }}
      >
        <AdminSidebar />
      </Box>

      {/* Mobile: sidebar appears above content */}
      <Container sx={{ display: { xs: "block", md: "none" }, py: 2 }}>
        <AdminSidebar />
      </Container>

      <Box
        sx={{
          flex: 1,
          ml: { md: `${SIDEBAR_W}px` },
        }}
      >
        <Container sx={{ py: { xs: 2, md: 3 } }}>
          <Box component="section" sx={{ minWidth: 0 }}>
            {children}
          </Box>
        </Container>
        <Footer />
      </Box>
    </Box>
  );
}

