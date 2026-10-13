import { ForbiddenException } from '@nestjs/common';
import {
  assertCanCreateCustomerRequest,
  assertCanCreateProviderProfile,
  assertCanJoinProviderTeam,
} from './account-kind';

describe('account kind', () => {
  it('не даёт клиенту создать кабинет исполнителя', () => {
    expect(() =>
      assertCanCreateProviderProfile({
        accountKind: 'CUSTOMER',
        systemRole: 'CUSTOMER',
      }),
    ).toThrow(ForbiddenException);
  });

  it('даёт исполнителю создать кабинет', () => {
    expect(() =>
      assertCanCreateProviderProfile({
        accountKind: 'PROVIDER',
        systemRole: 'CUSTOMER',
      }),
    ).not.toThrow();
  });

  it('не даёт исполнителю создать заявку заказчика', () => {
    expect(() =>
      assertCanCreateCustomerRequest({
        accountKind: 'PROVIDER',
        systemRole: 'CUSTOMER',
      }),
    ).toThrow(ForbiddenException);
  });

  it('даёт клиенту создать заявку', () => {
    expect(() =>
      assertCanCreateCustomerRequest({
        accountKind: 'CUSTOMER',
        systemRole: 'CUSTOMER',
      }),
    ).not.toThrow();
  });

  it('не приглашает клиента в команду исполнителя', () => {
    expect(() =>
      assertCanJoinProviderTeam({ accountKind: 'CUSTOMER' }),
    ).toThrow(ForbiddenException);
  });

  it('не ограничивает администратора платформы', () => {
    expect(() =>
      assertCanCreateProviderProfile({
        accountKind: 'CUSTOMER',
        systemRole: 'PLATFORM_ADMIN',
      }),
    ).not.toThrow();
    expect(() =>
      assertCanCreateCustomerRequest({
        accountKind: 'PROVIDER',
        systemRole: 'PLATFORM_ADMIN',
      }),
    ).not.toThrow();
  });
});
