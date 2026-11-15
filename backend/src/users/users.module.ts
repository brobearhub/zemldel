import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersAdminController } from './users-admin.controller';
import { UsersAdminService } from './users-admin.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [UsersController, UsersAdminController],
  providers: [UsersService, UsersAdminService],
})
export class UsersModule {}
