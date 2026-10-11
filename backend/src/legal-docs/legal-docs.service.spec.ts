import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LegalDocsService } from './legal-docs.service';

const backendRoot = join(__dirname, '..', '..');

describe('LegalDocsService', () => {
  it('читает текущие terms из репозитория', async () => {
    const doc = await new LegalDocsService().getCurrent('terms');
    expect(doc.id).toBe('terms');
    expect(doc.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(doc.title.length).toBeGreaterThan(0);
    expect(doc.markdown.length).toBeGreaterThan(0);
  });

  it('кладёт markdown в dist/legal, откуда его берёт опубликованная сборка', () => {
    execFileSync('sh', ['scripts/copy-legal-docs.sh'], {
      cwd: backendRoot,
    });

    const published = join(
      backendRoot,
      'dist',
      'legal',
      'terms',
      'latest',
      'terms.md',
    );
    expect(readFileSync(published, 'utf8')).toContain(`version:`);
  });
});
