"use client";

import { Box, Stack, Typography } from "@mui/material";
import { CdnOptimizedAvatar } from "@/shared/ui/cdn-image";

export type PublicTeamMember = {
  id: string;
  name: string;
  image: string | null;
  jobTitle: string | null;
};

export function ProviderTeam({
  members,
  compact = false,
}: {
  members?: PublicTeamMember[];
  compact?: boolean;
}) {
  if (!members?.length || (!compact && members.length < 2)) return null;
  if (compact) {
    const showTeamHeading = members.length > 1;
    return (
      <Stack
        component={showTeamHeading ? "section" : "div"}
        spacing={1}
        aria-label={showTeamHeading ? "Команда" : undefined}
        sx={{ minWidth: 0 }}
      >
        {showTeamHeading ? (
          <Typography
            variant="subtitle1"
            component="h3"
            sx={{ fontWeight: 700 }}
          >
            Команда
          </Typography>
        ) : null}
        <Stack
          component="ul"
          spacing={0.75}
          sx={{
            m: 0,
            p: 0,
            listStyle: "none",
          }}
        >
          {members.map((member) => (
            <Typography
              key={member.id}
              component="li"
              sx={{ overflowWrap: "anywhere" }}
            >
              {[member.jobTitle, member.name].filter(Boolean).join(" · ")}
            </Typography>
          ))}
        </Stack>
      </Stack>
    );
  }
  return (
    <Stack
      component="section"
      spacing={2}
      aria-label="Команда исполнителя"
      sx={{ minWidth: 0 }}
    >
      <Typography
        variant="h5"
        component="h2"
        sx={{ fontWeight: 700 }}
      >
        Команда исполнителя
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        {members.map((member) => (
          <Stack
            key={member.id}
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <CdnOptimizedAvatar
              src={member.image || undefined}
              alt={member.name}
              sizes="48px"
              sx={{
                width: 48,
                height: 48,
              }}
            >
              {member.name.slice(0, 1)}
            </CdnOptimizedAvatar>
            <Box
              sx={{
                minWidth: 0,
                overflowWrap: "anywhere",
              }}
            >
              <Typography sx={{ fontWeight: 600 }}>{member.name}</Typography>
              {member.jobTitle ? (
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary" }}
                >
                  {member.jobTitle}
                </Typography>
              ) : null}
            </Box>
          </Stack>
        ))}
      </Box>
    </Stack>
  );
}
