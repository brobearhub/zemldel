import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import { LegalDocsService } from '../legal-docs/legal-docs.service';

@ApiTags('public-offer')
@ApiStandardErrors()
@Controller()
export class PublicOfferController {
  constructor(private readonly legalDocs: LegalDocsService) {}

  @Get('public-offer/current')
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        markdown: { type: 'string' },
      },
      required: ['version', 'markdown'],
    },
  })
  async getCurrent() {
    const doc = await this.legalDocs.getCurrent('offer');
    return { version: doc.version, markdown: doc.markdown };
  }
}
