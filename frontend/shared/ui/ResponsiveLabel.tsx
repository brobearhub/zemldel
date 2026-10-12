import { Box } from "@mui/material";

type Props = {
  text: string;
  compactText?: string | null;
};

/**
 * Why: короткая подпись нужна только на узком экране.
 * Две строки в разметке и CSS `display` не зависят от `useMediaQuery`,
 * поэтому серверный HTML и клиент не расходятся.
 */
export function ResponsiveLabel({ text, compactText }: Props) {
  const compact = compactText?.trim();
  if (!compact || compact === text) return text;

  return (
    <>
      <Box component="span" sx={{ display: { xs: "inline", md: "none" } }}>
        {compact}
      </Box>
      <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
        {text}
      </Box>
    </>
  );
}
