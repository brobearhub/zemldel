import { describe, expect, it } from 'vitest';
import { pickPeerOnline } from './chat-presence';

describe('chat presence helpers', () => {
  it('pickPeerOnline selects opposite side', () => {
    expect(
      pickPeerOnline('customer', {
        conversationId: 'c1',
        customerOnline: true,
        providerOnline: false,
      }),
    ).toBe(false);
    expect(
      pickPeerOnline('provider', {
        conversationId: 'c1',
        customerOnline: true,
        providerOnline: false,
      }),
    ).toBe(true);
  });
});

