import Markdown from "react-markdown";

/** Only the formatting granted at publication is rendered. No HTML or embedded media. */
export function StoryText({
  text,
  format = "PLAIN",
  interactive = true,
}: {
  text: string;
  format?: "PLAIN" | "BASIC" | "LINKS";
  interactive?: boolean;
}) {
  if (format === "PLAIN") return <>{text}</>;
  return (
    <Markdown
      allowedElements={
        format === "LINKS"
          ? ["p", "strong", "em", "a", "br"]
          : ["p", "strong", "em", "br"]
      }
      unwrapDisallowed
      skipHtml
      urlTransform={(url) => (/^https?:\/\//i.test(url) ? url : "")}
      components={{
        p: ({ children }) => (
          <span style={{ display: "block", whiteSpace: "pre-wrap" }}>
            {children}
          </span>
        ),
        a: ({ href, children }) =>
          href && interactive ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              style={{ color: "inherit", textDecoration: "underline" }}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {children}
            </a>
          ) : (
            <>{children}</>
          ),
      }}
    >
      {text}
    </Markdown>
  );
}
