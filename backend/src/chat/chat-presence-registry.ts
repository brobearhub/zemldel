export class ChatPresenceRegistry {
  private readonly socketIdToUserId = new Map<string, string>();
  private readonly userIdToSocketIds = new Map<string, Set<string>>();
  private readonly disconnectTimersBySocketId = new Map<string, ReturnType<typeof setTimeout>>();

  isOnline(userId: string): boolean {
    return (this.userIdToSocketIds.get(userId)?.size ?? 0) > 0;
  }

  registerConnected(userId: string, socketId: string): { becameOnline: boolean } {
    const wasOnline = this.isOnline(userId);

    const pendingTimer = this.disconnectTimersBySocketId.get(socketId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.disconnectTimersBySocketId.delete(socketId);
    }

    this.socketIdToUserId.set(socketId, userId);
    const set = this.userIdToSocketIds.get(userId) ?? new Set<string>();
    set.add(socketId);
    this.userIdToSocketIds.set(userId, set);

    const becameOnline = !wasOnline && this.isOnline(userId);
    return { becameOnline };
  }

  scheduleDisconnected(
    socketId: string,
    graceMs: number,
    onFinalize?: (userId: string, becameOffline: boolean) => void,
  ) {
    if (this.disconnectTimersBySocketId.has(socketId)) {
      return;
    }

    const timer = setTimeout(() => {
      this.disconnectTimersBySocketId.delete(socketId);

      const userId = this.socketIdToUserId.get(socketId);
      if (!userId) return;

      const wasOnline = this.isOnline(userId);

      this.socketIdToUserId.delete(socketId);
      const set = this.userIdToSocketIds.get(userId);
      set?.delete(socketId);
      if (set && set.size === 0) {
        this.userIdToSocketIds.delete(userId);
      }

      const becameOffline = wasOnline && !this.isOnline(userId);
      onFinalize?.(userId, becameOffline);
    }, graceMs);

    this.disconnectTimersBySocketId.set(socketId, timer);
  }
}

