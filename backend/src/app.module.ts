import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { UsersModule } from './users/users.module';
import { ProvidersModule } from './providers/providers.module';
import { ChatModule } from './chat/chat.module';
import { ServiceCategoriesModule } from './service-categories/service-categories.module';
import { RequestsModule } from './requests/requests.module';
import { CitiesModule } from './cities/cities.module';
import { PublicOfferModule } from './public-offer/public-offer.module';
import { LegalDocsModule } from './legal-docs/legal-docs.module';
import { DocumentsModule } from './documents/documents.module';
import { RemindersModule } from './reminders/reminders.module';
import { ContractFilesModule } from './contract-files/contract-files.module';
import { RequestDocumentRequestsModule } from './request-document-requests/request-document-requests.module';

@Module({
  imports: [
    PrismaModule,
    LegalDocsModule,
    AuthModule,
    ServicesModule,
    ServiceCategoriesModule,
    RequestsModule,
    UsersModule,
    ProvidersModule,
    ChatModule,
    CitiesModule,
    PublicOfferModule,
    DocumentsModule,
    ContractFilesModule,
    RequestDocumentRequestsModule,
    RemindersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
