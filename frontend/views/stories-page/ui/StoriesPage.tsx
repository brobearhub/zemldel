import { Container, Stack } from "@mui/material";
import type { StoryScope } from "@/entities/story";
import { StoryEditorSection } from "@/widgets/story-editor";
import { StoryInboxSection } from "@/widgets/story-inbox";

type Props = {
  scope: StoryScope;
  providerName?: string | null;
  authorName?: string | null;
};

export function StoriesPage({ scope, providerName, authorName }: Props) {
  return (
    <Container maxWidth="xl" disableGutters>
      <Stack spacing={4}>
        <StoryEditorSection scope={scope} providerName={providerName} authorName={authorName} />
        <StoryInboxSection scope={scope} />
      </Stack>
    </Container>
  );
}
