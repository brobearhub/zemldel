import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseLegalMarkdown } from './parse-legal-markdown';

export const LEGAL_DOC_IDS = ['terms', 'privacy', 'consent', 'offer'] as const;
export type LegalDocId = (typeof LEGAL_DOC_IDS)[number];

export type LegalDocCurrent = {
  id: LegalDocId;
  version: string;
  title: string;
  markdown: string;
};

function isLegalDocId(value: string): value is LegalDocId {
  return (LEGAL_DOC_IDS as readonly string[]).includes(value);
}

@Injectable()
export class LegalDocsService {
  resolveDocId(raw: string): LegalDocId {
    const id = raw.trim().toLowerCase();
    if (!isLegalDocId(id)) {
      throw new BadRequestException(`Unknown legal doc id: ${raw}`);
    }
    return id;
  }

  async getCurrent(docId: LegalDocId): Promise<LegalDocCurrent> {
    const relative = join('legal', docId, 'latest', `${docId}.md`);
    const candidates = [
      join(process.cwd(), relative),
      // fallback: dist рядом с cwd или от скомпилированного файла
      join(process.cwd(), 'dist', relative),
      join(__dirname, '..', '..', relative),
    ];

    let raw: string | null = null;
    let lastError: unknown;
    for (const absolute of candidates) {
      try {
        raw = await readFile(absolute, 'utf-8');
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (raw === null) {
      void lastError;
      throw new InternalServerErrorException(
        `Legal doc file not found: ${relative}`,
      );
    }

    try {
      const parsed = parseLegalMarkdown(raw);
      return {
        id: docId,
        version: parsed.version,
        title: parsed.title,
        markdown: parsed.markdown,
      };
    } catch {
      throw new InternalServerErrorException(`Invalid legal doc: ${relative}`);
    }
  }

  async assertCurrentVersions<K extends LegalDocId>(
    expected: Record<K, string>,
  ): Promise<Record<K, string>> {
    const resolved = {} as Record<K, string>;
    for (const key of Object.keys(expected) as K[]) {
      const version = expected[key].trim();
      const current = await this.getCurrent(key);
      if (current.version !== version) {
        throw new BadRequestException({
          message: `Stale legal doc version for ${key}`,
          details: {
            docId: key,
            expected: version,
            current: current.version,
          },
        });
      }
      resolved[key] = current.version;
    }
    return resolved;
  }

  async requireDoc(docId: string): Promise<LegalDocCurrent> {
    try {
      return await this.getCurrent(this.resolveDocId(docId));
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new NotFoundException(`Legal doc not found: ${docId}`);
    }
  }
}
