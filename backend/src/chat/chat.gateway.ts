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

const CONVERSATION_PREFIX = 'conversation:';
const USER_PREFIX = 'user:';

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
    } catch (error) {
      this.logger.warn(`Socket connection rejected: ${error}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const data = client.data as unknown as { userId?: string };
    data.userId = undefined;
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
      await this.chatService.assertConversationAccess(userId, conversationId, 'read');
    } catch {
      return { ok: false, error: 'Forbidden' };
    }

    for (const room of client.rooms) {
      if (room !== client.id && room.startsWith(CONVERSATION_PREFIX)) {
        void client.leave(room);
      }
    }

    void client.join(`${CONVERSATION_PREFIX}${conversationId}`);
    return { ok: true };
  }

  emitMessageCreated(conversationId: string, payload: unknown) {
    this.server
      .to(`${CONVERSATION_PREFIX}${conversationId}`)
      .emit('message.created', payload);
  }

  emitUnreadHint(userId: string, payload: unknown) {
    this.server.to(`${USER_PREFIX}${userId}`).emit('chat.unreadHint', payload);
  }
}
