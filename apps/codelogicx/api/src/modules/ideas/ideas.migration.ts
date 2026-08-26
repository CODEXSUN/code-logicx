import { sql, type Kysely } from "kysely";
import type { CodeLogicXDatabase } from "../../database/schema.js";

export const ideasMigration = {
  description: "Project idea discussions, engagement, polls, and attachments without foreign keys.",
  key: "codelogicx.ideas.sql.v1"
} as const;

export async function migrateIdeasModule(database: Kysely<CodeLogicXDatabase>) {
  await sql`CREATE TABLE IF NOT EXISTS codelogicx_ideas (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL, title VARCHAR(240) NOT NULL,
    excerpt VARCHAR(500) NOT NULL DEFAULT '', content_html LONGTEXT NOT NULL, category VARCHAR(80) NOT NULL DEFAULT 'General',
    tags_json TEXT NOT NULL, project_uuids_json TEXT NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'open',
    author VARCHAR(240) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_codelogicx_ideas_uuid (uuid), KEY idx_codelogicx_ideas_status_updated (status, updated_at),
    KEY idx_codelogicx_ideas_category (category)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS codelogicx_idea_comments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL, idea_uuid CHAR(8) NOT NULL,
    parent_uuid CHAR(8) NULL, body_html TEXT NOT NULL, author VARCHAR(240) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_codelogicx_idea_comments_uuid (uuid), KEY idx_codelogicx_idea_comments_idea (idea_uuid, created_at),
    KEY idx_codelogicx_idea_comments_parent (parent_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS codelogicx_idea_likes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL, entity_kind VARCHAR(16) NOT NULL,
    entity_uuid CHAR(8) NOT NULL, actor VARCHAR(240) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_codelogicx_idea_likes_uuid (uuid), UNIQUE KEY uq_codelogicx_idea_likes_actor (entity_kind, entity_uuid, actor),
    KEY idx_codelogicx_idea_likes_entity (entity_kind, entity_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS codelogicx_idea_polls (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL, idea_uuid CHAR(8) NOT NULL,
    question VARCHAR(300) NOT NULL, options_json TEXT NOT NULL, multiple_choice BOOLEAN NOT NULL DEFAULT FALSE,
    closes_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_codelogicx_idea_polls_uuid (uuid), UNIQUE KEY uq_codelogicx_idea_polls_idea (idea_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS codelogicx_idea_poll_votes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL, poll_uuid CHAR(8) NOT NULL,
    option_id VARCHAR(40) NOT NULL, actor VARCHAR(240) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_codelogicx_idea_poll_votes_uuid (uuid), UNIQUE KEY uq_codelogicx_idea_poll_vote (poll_uuid, option_id, actor),
    KEY idx_codelogicx_idea_poll_votes_poll (poll_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS codelogicx_idea_attachments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL, idea_uuid CHAR(8) NOT NULL,
    name VARCHAR(240) NOT NULL, mime_type VARCHAR(120) NOT NULL, size_bytes INT UNSIGNED NOT NULL,
    data_base64 LONGTEXT NOT NULL, created_by VARCHAR(240) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_codelogicx_idea_attachments_uuid (uuid), KEY idx_codelogicx_idea_attachments_idea (idea_uuid, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS codelogicx_idea_drawings (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL, idea_uuid CHAR(8) NOT NULL,
    scene_json LONGTEXT NOT NULL, updated_by VARCHAR(240) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_codelogicx_idea_drawings_uuid (uuid), UNIQUE KEY uq_codelogicx_idea_drawings_idea (idea_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  return ideasMigration;
}
