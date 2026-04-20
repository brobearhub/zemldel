import { Module } from '@nestjs/common';
import { PublicOfferController } from './public-offer.controller';

@Module({
  controllers: [PublicOfferController],
})
export class PublicOfferModule {}

