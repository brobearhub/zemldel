import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  selectGeocodingPorts,
  type GeocodingAdapterFactory,
} from './geocoding.config';
import { GeocodingController } from './geocoding.controller';
import { GeocodingPorts } from './geocoding.ports';
import { GeocodingService } from './geocoding.service';
import { DaDataAdapter } from './providers/dadata/dadata.adapter';

const factories = new Map<string, GeocodingAdapterFactory>([
  [
    'dadata',
    () => {
      const adapter = new DaDataAdapter();
      return { suggestions: adapter, cityCenter: adapter, cadastral: adapter };
    },
  ],
]);

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [GeocodingController],
  providers: [
    {
      provide: GeocodingPorts,
      useFactory: () => selectGeocodingPorts(process.env, factories),
    },
    GeocodingService,
  ],
  exports: [GeocodingService],
})
export class GeocodingModule {}
