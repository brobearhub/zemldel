-- Сигнал доставляется только после COMMIT; при ROLLBACK уведомления нет.
-- Данные остаются в outbox: NOTIFY лишь будит обработчик, не хранит сообщения.
CREATE FUNCTION messenger_queue_notify() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('messenger_queue_ready', '');
  RETURN NULL;
END;
$$;

CREATE TRIGGER messenger_outbox_insert_notify
AFTER INSERT ON "MessengerOutbox"
FOR EACH STATEMENT EXECUTE FUNCTION messenger_queue_notify();

CREATE INDEX "MessengerDelivery_connection_pending_order_idx"
ON "MessengerDelivery" ("connectionId", "status", "createdAt", "part", "id");
