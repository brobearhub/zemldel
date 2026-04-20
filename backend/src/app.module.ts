import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { ServicesModule } from './services/services.module';
import { UsersModule } from './users/users.module';
import { ProvidersModule } from './providers/providers.module';
import { ChatModule } from './chat/chat.module';
import { ServiceCategoriesModule } from './service-categories/service-categories.module';
import { ServiceRequestsModule } from './service-requests/service-requests.module';
import { CitiesModule } from './cities/cities.module';
import { PublicOfferModule } from './public-offer/public-offer.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ServicesModule,
    ServiceCategoriesModule,
    ServiceRequestsModule,
    OrdersModule,
    UsersModule,
    ProvidersModule,
    ChatModule,
    CitiesModule,
    PublicOfferModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
