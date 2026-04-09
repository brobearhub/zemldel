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
import { ServiceTemplatesModule } from './service-templates/service-templates.module';
import { ServiceRequestsModule } from './service-requests/service-requests.module';
import { CitiesModule } from './cities/cities.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ServicesModule,
    ServiceCategoriesModule,
    ServiceTemplatesModule,
    ServiceRequestsModule,
    OrdersModule,
    UsersModule,
    ProvidersModule,
    ChatModule,
    CitiesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
