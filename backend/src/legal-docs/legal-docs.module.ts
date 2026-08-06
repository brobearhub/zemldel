import { Global, Module } from '@nestjs/common';
import { LegalDocsController } from './legal-docs.controller';
import { LegalDocsService } from './legal-docs.service';

@Global()
@Module({
  controllers: [LegalDocsController],
  providers: [LegalDocsService],
  exports: [LegalDocsService],
})
export class LegalDocsModule {}
