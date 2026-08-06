import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import { LegalDocsService } from './legal-docs.service';

@ApiTags('legal-docs')
@ApiStandardErrors()
@Controller('legal-docs')
export class LegalDocsController {
  constructor(private readonly legalDocs: LegalDocsService) {}

  @Get(':docId/current')
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        version: { type: 'string' },
        title: { type: 'string' },
        markdown: { type: 'string' },
      },
      required: ['id', 'version', 'title', 'markdown'],
    },
  })
  getCurrent(@Param('docId') docId: string) {
    return this.legalDocs.requireDoc(docId);
  }
}
