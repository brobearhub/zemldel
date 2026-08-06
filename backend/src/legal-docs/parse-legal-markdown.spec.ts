import { describe, expect, it } from 'vitest';
import { parseLegalMarkdown } from './parse-legal-markdown';

describe('parseLegalMarkdown', () => {
  it('parses version, title and body', () => {
    const raw = `---
version: 2026-08-04
title: Test Doc
---

# Hello
`;
    expect(parseLegalMarkdown(raw)).toEqual({
      version: '2026-08-04',
      title: 'Test Doc',
      markdown: '\n# Hello\n',
    });
  });

  it('rejects missing frontmatter', () => {
    expect(() => parseLegalMarkdown('# Hello\n')).toThrow(/frontmatter/i);
  });
});
