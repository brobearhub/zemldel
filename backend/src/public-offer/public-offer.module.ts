import { Module } from '@nestjs/common';
import { LegalDocsModule } from '../legal-docs/legal-docs.module';
import { PublicOfferController } from './public-offer.controller';

@Module({
  imports: [LegalDocsModule],
  controllers: [PublicOfferController],
})
export class PublicOfferModule {}
