import { Container, Stack } from "@mui/material";
import type { StoryScope } from "@/entities/story";
import { StoryEditorSection } from "@/widgets/story-editor";
import { StoryInboxSection } from "@/widgets/story-inbox";

type Props = {
  scope: StoryScope;
  saved?: boolean;
  providerName?: string | null;
  authorName?: string | null;
};

export function StoriesPage({ scope, providerName, authorName, saved }: Props) {
  return (
    <Container maxWidth="xl" disableGutters>
      <Stack spacing={4}>
        <StoryEditorSection initialLane={saved ? "saved" : "live"} scope={scope} providerName={providerName} authorName={authorName} />
        {!saved ? <StoryInboxSection scope={scope} /> : null}
      </Stack>
    </Container>
  );
}
