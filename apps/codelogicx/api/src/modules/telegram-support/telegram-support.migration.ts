import { sql, type Kysely } from "kysely";
import type { CodeLogicXDatabase } from "../../database/schema.js";

export const telegramSupportMigration = {
  description: "Telegram account links and persisted chat messages.",
  key: "codelogicx.telegram-support.sql.v1"
} as const;

export const telegramMtprotoMigration = {
  description: "Encrypted Telegram MTProto account sessions.",
  key: "codelogicx.telegram-support.mtproto.sql.v2"
} as const;

export async function migrateTelegramSupportModule(database: Kysely<CodeLogicXDatabase>) {
  await sql`CREATE TABLE IF NOT EXISTS codelogicx_telegram_connections (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(16) NOT NULL,
    link_token_hash CHAR(64) NOT NULL, chat_id VARCHAR(40) NULL,
    telegram_username VARCHAR(80) NOT NULL DEFAULT '', display_name VARCHAR(160) NOT NULL DEFAULT '',
    status VARCHAR(24) NOT NULL DEFAULT 'pending', connected_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_codelogicx_telegram_connections_uuid (uuid),
    UNIQUE KEY uq_codelogicx_telegram_connections_token (link_token_hash),
    KEY idx_codelogicx_telegram_connections_chat (chat_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS codelogicx_telegram_messages (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(16) NOT NULL,
    chat_id VARCHAR(40) NOT NULL, direction VARCHAR(16) NOT NULL,
    body TEXT NOT NULL, telegram_message_id VARCHAR(40) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_codelogicx_telegram_messages_uuid (uuid),
    KEY idx_codelogicx_telegram_messages_chat (chat_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  return telegramSupportMigration;
}

export async function migrateTelegramMtprotoModule(database: Kysely<CodeLogicXDatabase>) {
  await sql`ALTER TABLE codelogicx_telegram_connections
    ADD COLUMN IF NOT EXISTS auth_mode VARCHAR(24) NOT NULL DEFAULT 'bot' AFTER uuid,
    ADD COLUMN IF NOT EXISTS encrypted_session TEXT NULL AFTER link_token_hash`.execute(database);
  return telegramMtprotoMigration;
}
