import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const CURRENT_PUBLIC_OFFER_VERSION = '2026-04-19' as const;
const CURRENT_PUBLIC_OFFER_DOC = `public-offer-${CURRENT_PUBLIC_OFFER_VERSION}.md` as const;

@Controller()
export class PublicOfferController {
  @Get('public-offer/current')
  async getCurrent() {
    const absolute = resolve(process.cwd(), '..', 'docs', CURRENT_PUBLIC_OFFER_DOC);
    try {
      const markdown = await readFile(absolute, 'utf-8');
      return { version: CURRENT_PUBLIC_OFFER_VERSION, markdown };
    } catch (error) {
      throw new InternalServerErrorException(
        `Public offer file not found: ${CURRENT_PUBLIC_OFFER_DOC}`,
      );
    }
  }
}

