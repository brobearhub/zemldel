export type ParsedLegalMarkdown = {
  version: string;
  title: string;
  markdown: string;
};

/**
 * Простой парсер YAML frontmatter (version/title) без внешней зависимости.
 * Фабрика результата из сырого markdown-файла.
 */
export function parseLegalMarkdown(raw: string): ParsedLegalMarkdown {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Legal doc must start with YAML frontmatter');
  }

  const frontmatter = match[1] ?? '';
  const markdown = (match[2] ?? '').replace(/^\uFEFF/, '');

  const version = frontmatter.match(/^version:\s*(.+)\s*$/m)?.[1]?.trim();
  const title = frontmatter.match(/^title:\s*(.+)\s*$/m)?.[1]?.trim();

  if (!version || !/^\d{4}-\d{2}-\d{2}$/.test(version)) {
    throw new Error('Legal doc frontmatter.version must be YYYY-MM-DD');
  }
  if (!title) {
    throw new Error('Legal doc frontmatter.title is required');
  }

  return { version, title, markdown };
}
