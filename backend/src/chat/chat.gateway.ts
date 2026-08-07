import { forwardRef, Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SocketJwtService } from './socket-jwt.service';
import { ChatPresenceRegistry } from './chat-presence-registry';
import { pickPeerOnline, type ChatPresenceUpdatedPayload } from './chat-presence';

const CONVERSATION_PREFIX = 'conversation:';
const USER_PREFIX = 'user:';
const DISCONNECT_GRACE_MS = 2500;

export type JoinConversationPayload = {
  conversationId: string;
};

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly presence = new ChatPresenceRegistry();

  constructor(
    private readonly socketJwt: SocketJwtService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        typeof client.handshake.auth?.token === 'string'
          ? client.handshake.auth.token
          : undefined;
      const { sub: userId } = this.socketJwt.verify(token);
      const data = client.data as unknown as { userId?: string };
      data.userId = userId;
      void client.join(`${USER_PREFIX}${userId}`);
      const { becameOnline } = this.presence.registerConnected(userId, client.id);
      if (becameOnline) {
        void this.chatService.notifyPresenceChanged(userId);
      }
    } catch (error) {
      this.logger.warn(`Socket connection rejected: ${error}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const data = client.data as unknown as { userId?: string };
    data.userId = undefined;
    this.presence.scheduleDisconnected(
      client.id,
      DISCONNECT_GRACE_MS,
      (userId, becameOffline) => {
        if (becameOffline) {
          void this.chatService.notifyPresenceChanged(userId);
        }
      },
    );
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: JoinConversationPayload,
  ) {
    const data = client.data as unknown as { userId?: string };
    const userId = data.userId;
    if (!userId) {
      return { ok: false, error: 'Unauthorized' };
    }

    const conversationId = body?.conversationId;
    if (!conversationId) {
      return { ok: false, error: 'conversationId required' };
    }

    try {
      await this.chatService.assertConversationAccess(
        userId,
        conversationId,
        'read',
      );
    } catch {
      return { ok: false, error: 'Forbidden' };
    }

    for (const room of client.rooms) {
      if (room !== client.id && room.startsWith(CONVERSATION_PREFIX)) {
        void client.leave(room);
      }
    }

    void client.join(`${CONVERSATION_PREFIX}${conversationId}`);
    const snapshot = await this.chatService.getConversationPresenceSnapshot(
      userId,
      conversationId,
    );
    if (!snapshot) {
      return { ok: false, error: 'NotFound' };
    }
    return {
      ok: true,
      viewerSide: snapshot.viewerSide,
      peerOnline: pickPeerOnline(snapshot.viewerSide, snapshot.presence),
    };
  }

  emitMessageCreated(conversationId: string, payload: unknown) {
    this.server
      .to(`${CONVERSATION_PREFIX}${conversationId}`)
      .emit('message.created', payload);
  }

  emitUnreadHint(userId: string, payload: unknown) {
    this.server.to(`${USER_PREFIX}${userId}`).emit('chat.unreadHint', payload);
  }

  emitPresenceUpdated(conversationId: string, payload: ChatPresenceUpdatedPayload) {
    this.server
      .to(`${CONVERSATION_PREFIX}${conversationId}`)
      .emit('presence.updated', payload);
  }

  isUserOnline(userId: string): boolean {
    return this.presence.isOnline(userId);
  }
}
