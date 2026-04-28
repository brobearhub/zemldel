import { Box, Link as MuiLink } from "@mui/material";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

type Props = {
  markdown: string;
  /**
   * Useful when the page already renders a title separately and the markdown
   * starts with `# ...`.
   */
  skipFirstH1?: boolean;
};

const components: Components = {
  a({ href, children, title }) {
    const isExternal = typeof href === "string" && /^https?:\/\//i.test(href);
    return (
      <MuiLink
        href={href}
        title={title}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
      >
        {children}
      </MuiLink>
    );
  },
};

function stripFirstH1(markdown: string) {
  return markdown.replace(/^\s*# .*\n+/, "");
}

export function Markdown({ markdown, skipFirstH1 }: Props) {
  const source = skipFirstH1 ? stripFirstH1(markdown) : markdown;

  return (
    <Box
      sx={{
        "& h1": { typography: "h4", fontWeight: 800, mt: 2.5, mb: 1 },
        "& h2": { typography: "h5", fontWeight: 800, mt: 2.25, mb: 1 },
        "& h3": { typography: "h6", fontWeight: 800, mt: 2, mb: 0.75 },
        "& h4": { typography: "subtitle1", fontWeight: 800, mt: 2, mb: 0.75 },
        "& p": { typography: "body1", color: "text.primary", mb: 1.25 },
        "& ul, & ol": { pl: 3, mb: 1.25 },
        "& li": { mb: 0.5 },
        "& li > p": { mb: 0.75 },
        "& hr": { my: 2, borderColor: "divider" },
        "& blockquote": {
          my: 1.5,
          pl: 2,
          borderLeft: "4px solid",
          borderLeftColor: "divider",
          color: "text.secondary",
        },
        "& pre": {
          my: 1.5,
          p: 2,
          borderRadius: 1,
          overflowX: "auto",
          bgcolor: "action.hover",
        },
        "& code": {
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          fontSize: "0.9em",
          bgcolor: "action.hover",
          px: 0.6,
          py: 0.2,
          borderRadius: 0.75,
        },
        "& pre code": { bgcolor: "transparent", p: 0 },
        "& table": { width: "100%", borderCollapse: "collapse", my: 2 },
        "& th, & td": { border: "1px solid", borderColor: "divider", p: 1, verticalAlign: "top" },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {source}
      </ReactMarkdown>
    </Box>
  );
}

