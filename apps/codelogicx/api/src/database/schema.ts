import type { ColumnType, Generated } from "kysely";

export type TimestampColumn = ColumnType<
  Date,
  Date | string | undefined,
  Date | string | undefined
>;

export type CodeLogicXDatabase = {
  schema_migrations: CodeLogicXMigrationsTable;
  codelogicx_users: CodeLogicXUsersTable;
  codelogicx_ideas: IdeasTable;
  codelogicx_idea_comments: IdeaCommentsTable;
  codelogicx_idea_likes: IdeaLikesTable;
  codelogicx_idea_polls: IdeaPollsTable;
  codelogicx_idea_poll_votes: IdeaPollVotesTable;
  codelogicx_idea_attachments: IdeaAttachmentsTable;
  codelogicx_idea_drawings: IdeaDrawingsTable;
  codelogicx_planning_boards: PlanningBoardsTable;
  codelogicx_planning_board_links: PlanningBoardLinksTable;
  codelogicx_planning_comments: PlanningCommentsTable;
  codelogicx_planning_reactions: PlanningReactionsTable;
  codelogicx_orchestration_chat_messages: OrchestrationChatMessagesTable;
  codelogicx_orchestration_chat_threads: OrchestrationChatThreadsTable;
  codelogicx_agent_runs: AgentRunsTable;
  codelogicx_agent_run_steps: AgentRunStepsTable;
  codelogicx_agent_events: AgentEventsTable;
  codelogicx_agent_approvals: AgentApprovalsTable;
  codelogicx_agent_artifacts: AgentArtifactsTable;
  codelogicx_agent_tool_calls: AgentToolCallsTable;
  codelogicx_agent_verifications: AgentVerificationsTable;
  codelogicx_agent_tasks: AgentTasksTable;
  codelogicx_agent_task_dependencies: AgentTaskDependenciesTable;
  codelogicx_agent_parent_reviews: AgentParentReviewsTable;
  codelogicx_agent_personas: AgentPersonasTable;
  codelogicx_model_provider_connections: ModelProviderConnectionsTable;
  codelogicx_project_manager_activity: ProjectManagerActivityTable;
  codelogicx_project_manager_attachments: ProjectManagerAttachmentsTable;
  codelogicx_project_manager_items: ProjectManagerItemsTable;
  codelogicx_project_manager_registry_groups: ProjectManagerRegistryGroupsTable;
  codelogicx_project_manager_registry_modules: ProjectManagerRegistryModulesTable;
  codelogicx_project_manager_registry_platforms: ProjectManagerRegistryPlatformsTable;
  codelogicx_repository_connections: RepositoryConnectionsTable;
  codelogicx_task_manager_activity: TaskManagerActivityTable;
  codelogicx_task_manager_lookups: TaskManagerLookupsTable;
  codelogicx_task_manager_todos: TaskManagerTodosTable;
  codelogicx_telegram_connections: TelegramConnectionsTable;
  codelogicx_telegram_messages: TelegramMessagesTable;
  codelogicx_honey_threads: HoneyThreadsTable;
  codelogicx_honey_messages: HoneyMessagesTable;
  codelogicx_honey_memory: HoneyMemoryTable;
  codelogicx_notifications: NotificationsTable;
  codelogicx_notification_jobs: NotificationJobsTable;
  codelogicx_sync_conflicts: CodeLogicXSyncConflictsTable;
  codelogicx_sync_connections: CodeLogicXSyncConnectionsTable;
  codelogicx_sync_runs: CodeLogicXSyncRunsTable;
  codelogicx_sync_snapshots: CodeLogicXSyncSnapshotsTable;
  codelogicx_sync_tokens: CodeLogicXSyncTokensTable;
};

export type IdeasTable = {
  id: Generated<number>;
  uuid: string;
  assignee_uuids_json: string;
  title: string;
  excerpt: string;
  content_html: string;
  category: string;
  category_color: string;
  tags_json: string;
  project_uuids_json: string;
  status: string;
  status_color: string;
  visibility: "private" | "public";
  author: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
};
export type IdeaCommentsTable = {
  id: Generated<number>;
  uuid: string;
  idea_uuid: string;
  parent_uuid: string | null;
  body_html: string;
  author: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
};
export type IdeaLikesTable = {
  id: Generated<number>;
  uuid: string;
  entity_kind: string;
  entity_uuid: string;
  actor: string;
  created_at: TimestampColumn;
};
export type IdeaPollsTable = {
  id: Generated<number>;
  uuid: string;
  idea_uuid: string;
  question: string;
  options_json: string;
  multiple_choice: boolean;
  closes_at: TimestampColumn | null;
  created_at: TimestampColumn;
};
export type IdeaPollVotesTable = {
  id: Generated<number>;
  uuid: string;
  poll_uuid: string;
  option_id: string;
  actor: string;
  created_at: TimestampColumn;
};
export type IdeaAttachmentsTable = {
  id: Generated<number>;
  uuid: string;
  idea_uuid: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  data_base64: string;
  storage_key: string | null;
  created_by: string;
  created_at: TimestampColumn;
};
export type IdeaDrawingsTable = {
  id: Generated<number>;
  uuid: string;
  idea_uuid: string;
  scene_json: string;
  updated_by: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
};

export type ModelProviderConnectionsTable = {
  actor_id: string;
  base_url: string;
  created_at: TimestampColumn;
  encrypted_api_key: string | null;
  id: Generated<number>;
  label: string;
  last_error: string | null;
  last_tested_at: TimestampColumn | null;
  model: string;
  provider: string;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type NotificationsTable = {
  action_url: string | null;
  actor_id: string;
  body: string;
  category: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  metadata_json: string;
  read_at: TimestampColumn | null;
  recipient_actor_id: string;
  recipient_email: string | null;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type NotificationJobsTable = {
  attempts: Generated<number>;
  available_at: TimestampColumn;
  backend: string;
  channel: string;
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  failed_at: TimestampColumn | null;
  id: Generated<number>;
  idempotency_key: string;
  last_error: string;
  locked_at: TimestampColumn | null;
  max_attempts: number;
  notification_uuid: string;
  queue_name: string;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type HoneyThreadsTable = {
  actor_id: string;
  codex_thread_id: string | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type HoneyMessagesTable = {
  actor_id: string;
  body: string;
  context_json: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  role: string;
  thread_uuid: string;
  uuid: string;
};

export type HoneyMemoryTable = {
  actor_id: string;
  content: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  kind: string;
  review_note: string;
  source_label: string;
  supersedes_uuid: string | null;
  version: number;
  source_thread_uuid: string | null;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type RepositoryConnectionsTable = {
  base_url: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  name: string;
  provider: string;
  repository_slug: string;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type AgentTasksTable = {
  actor_id: string;
  agent_profile: string;
  delegate_persona_uuid: string | null;
  child_run_uuid: string | null;
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  objective: string;
  parent_run_uuid: string;
  result_summary: string | null;
  scope_json: string;
  sequence_no: number;
  started_at: TimestampColumn | null;
  status: string;
  task_key: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type AgentPersonasTable = {
  actor_id: string;
  agent_profile: string;
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  instructions: string;
  name: string;
  persona_key: string;
  role: string;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type AgentTaskDependenciesTable = {
  created_at: TimestampColumn;
  depends_on_task_uuid: string;
  id: Generated<number>;
  task_uuid: string;
};

export type AgentParentReviewsTable = {
  actor_id: string;
  created_at: TimestampColumn;
  decision: string;
  id: Generated<number>;
  note: string;
  parent_run_uuid: string;
  uuid: string;
};

export type AgentRunsTable = {
  access_mode: string;
  actor_id: string;
  agent_profile: string;
  connection_id: string;
  supervisor_persona_uuid: string | null;
  assist_mode: string;
  budget_json: string;
  chat_thread_uuid: string;
  codex_thread_id: string | null;
  codex_turn_id: string | null;
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  error_message: string | null;
  id: Generated<number>;
  model: string;
  objective: string;
  project_key: string;
  project_title: string;
  project_uuid: string;
  result_summary: string | null;
  started_at: TimestampColumn | null;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
  base_revision: string | null;
  branch_name: string | null;
  commit_hash: string | null;
  committed_at: TimestampColumn | null;
  review_status: string;
  source_root: string | null;
  verification_completed_at: TimestampColumn | null;
  verification_fingerprint: string | null;
  verification_status: string;
  workspace_cleaned_at: TimestampColumn | null;
  workspace_mode: string;
  workspace_path: string | null;
  workspace_status: string;
};

export type AgentVerificationsTable = {
  args_json: string;
  attempt_no: number;
  command_id: string;
  command_name: string;
  completed_at: TimestampColumn;
  created_at: TimestampColumn;
  duration_ms: number;
  exit_code: number | null;
  id: Generated<number>;
  label: string;
  required_gate: number;
  run_uuid: string;
  status: string;
  stderr_text: string;
  stdout_text: string;
  uuid: string;
};

export type AgentRunStepsTable = {
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  kind: string;
  label: string;
  output_json: string;
  run_uuid: string;
  sequence_no: number;
  started_at: TimestampColumn | null;
  status: string;
  uuid: string;
};

export type AgentEventsTable = {
  actor_id: string;
  created_at: TimestampColumn;
  event_type: string;
  id: Generated<number>;
  payload_json: string;
  run_uuid: string;
  uuid: string;
};

export type AgentApprovalsTable = {
  actor_id: string;
  created_at: TimestampColumn;
  decision: string | null;
  decided_at: TimestampColumn | null;
  id: Generated<number>;
  reason: string;
  request_id: number;
  run_uuid: string;
  status: string;
  thread_id: string;
  uuid: string;
};

export type AgentArtifactsTable = {
  artifact_type: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  label: string;
  metadata_json: string;
  path: string;
  run_uuid: string;
  uuid: string;
};

export type AgentToolCallsTable = {
  completed_at: TimestampColumn | null;
  created_at: TimestampColumn;
  id: Generated<number>;
  input_json: string;
  output_json: string;
  risk_level: string;
  run_uuid: string;
  started_at: TimestampColumn;
  status: string;
  tool_name: string;
  uuid: string;
};

export type OrchestrationChatThreadsTable = {
  access_mode: string;
  actor_id: string;
  codex_thread_id: string | null;
  connection_id: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  model: string;
  project_key: string;
  project_title: string;
  project_uuid: string;
  work_item_key: string | null;
  work_item_kind: string | null;
  work_item_title: string | null;
  work_item_uuid: string | null;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type OrchestrationChatMessagesTable = {
  actions_json: string;
  actor_id: string;
  attachments_json: string;
  body: string;
  created_at: TimestampColumn;
  duration_ms: number | null;
  feedback: string | null;
  files_json: string;
  id: Generated<number>;
  role: string;
  thread_uuid: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type TelegramConnectionsTable = {
  auth_mode: string;
  chat_id: string | null;
  connected_at: TimestampColumn | null;
  created_at: TimestampColumn;
  display_name: string;
  encrypted_session: string | null;
  id: Generated<number>;
  link_token_hash: string;
  status: string;
  telegram_username: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type TelegramMessagesTable = {
  body: string;
  chat_id: string;
  created_at: TimestampColumn;
  direction: string;
  id: Generated<number>;
  telegram_message_id: string | null;
  uuid: string;
};

export type PlanningBoardsTable = SyncColumns & {
  created_at: TimestampColumn;
  created_by: string;
  description: string;
  id: Generated<number>;
  project_uuid: string | null;
  scene_json: string;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  updated_by: string;
  uuid: string;
};

export type PlanningBoardLinksTable = SyncColumns & {
  board_uuid: string;
  created_at: TimestampColumn;
  created_by: string;
  id: Generated<number>;
  record_kind: string;
  record_uuid: string;
  uuid: string;
};

export type PlanningCommentsTable = SyncColumns & {
  board_uuid: string;
  body: string;
  created_at: TimestampColumn;
  created_by: string;
  element_id: string | null;
  id: Generated<number>;
  mentions_json: string;
  resolved_at: TimestampColumn | null;
  resolved_by: string | null;
  status: string;
  updated_at: TimestampColumn;
  updated_by: string;
  uuid: string;
};

export type PlanningReactionsTable = SyncColumns & {
  comment_uuid: string;
  created_at: TimestampColumn;
  created_by: string;
  id: Generated<number>;
  reaction: string;
  uuid: string;
};

export type SyncColumns = {
  sync_direction: ColumnType<string, string | undefined, string | undefined>;
  sync_status: ColumnType<string, string | undefined, string | undefined>;
  sync_updated_at: TimestampColumn;
  sync_version: ColumnType<number, number | undefined, number | undefined>;
};

export type CodeLogicXUsersTable = {
  created_at: TimestampColumn;
  email: string;
  id: Generated<number>;
  last_login_at: TimestampColumn | null;
  name: string;
  password_hash: string;
  role: string;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type CodeLogicXMigrationsTable = {
  applied_at: TimestampColumn;
  id: Generated<number>;
  name: string;
  package_id: ColumnType<string, string | undefined, string | undefined>;
};

export type ProjectManagerItemsTable = SyncColumns & {
  active: number;
  assignee: string;
  created_at: TimestampColumn;
  description: string;
  dependencies_json: string;
  due_date: string;
  id: Generated<number>;
  item_key: string;
  item_type: string;
  kind: string;
  lane: string;
  logo_text: string;
  color_key: string;
  repository_name: string;
  repository_url: string;
  module_key: string;
  priority: string;
  reference_id: string;
  reference_type: string;
  sort_order: number;
  start_date: string;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type ProjectManagerRegistryPlatformsTable = SyncColumns & {
  active: number;
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  platform_key: string;
  name: string;
  sort_order: number;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type ProjectManagerRegistryGroupsTable = SyncColumns & {
  active: number;
  created_at: TimestampColumn;
  description: string;
  group_key: string;
  id: Generated<number>;
  name: string;
  parent_group_uuid: string | null;
  platform_uuid: string;
  sort_order: number;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type ProjectManagerRegistryModulesTable = SyncColumns & {
  active: number;
  created_at: TimestampColumn;
  description: string;
  documentation_json: string;
  group_uuid: string;
  id: Generated<number>;
  module_key: string;
  module_type: string;
  name: string;
  parent_module_uuid: string | null;
  planning_notes_json: string;
  route_path: string;
  sort_order: number;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type ProjectManagerActivityTable = SyncColumns & {
  action: string;
  actor_email: string;
  created_at: TimestampColumn;
  details_json: string;
  id: Generated<number>;
  record_kind: string;
  record_uuid: string;
  uuid: string;
};

export type ProjectManagerAttachmentsTable = SyncColumns & {
  checksum: string;
  created_at: TimestampColumn;
  created_by: string;
  id: Generated<number>;
  mime_type: string;
  original_name: string;
  record_kind: string;
  record_uuid: string;
  size_bytes: number;
  storage_key: string;
  uuid: string;
};

export type TaskManagerTodosTable = SyncColumns & {
  category: string;
  created_at: TimestampColumn;
  description: string;
  due_date: string;
  group_name: string;
  project_uuid: string;
  id: Generated<number>;
  owner_email: string;
  position: number;
  priority: string;
  scope_key: string;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type TaskManagerLookupsTable = SyncColumns & {
  created_at: TimestampColumn;
  id: Generated<number>;
  kind: string;
  name: string;
  scope_key: string;
  uuid: string;
  value: string;
};

export type TaskManagerActivityTable = SyncColumns & {
  action: string;
  actor_email: string;
  created_at: TimestampColumn;
  details_json: string;
  id: Generated<number>;
  record_uuid: string;
  uuid: string;
};

export type CodeLogicXSyncTokensTable = {
  created_at: TimestampColumn;
  created_by: string;
  id: Generated<number>;
  label: string;
  last_used_at: TimestampColumn | null;
  status: string;
  token_hash: string;
  uuid: string;
};

export type CodeLogicXSyncConnectionsTable = {
  created_at: TimestampColumn;
  encrypted_token: string;
  id: Generated<number>;
  instance_id: string;
  last_error: string | null;
  last_verified_at: TimestampColumn | null;
  last_published_at: TimestampColumn | null;
  last_pulled_at: TimestampColumn | null;
  remote_revision: number;
  server_id: string;
  server_url: string;
  status: string;
  updated_at: TimestampColumn;
};

export type CodeLogicXSyncSnapshotsTable = {
  checksum: string;
  created_at: TimestampColumn;
  id: Generated<number>;
  payload_json: string;
  published_by: string;
  revision: number;
  server_id: string;
};

export type CodeLogicXSyncRunsTable = {
  completed_at: TimestampColumn | null;
  direction: string;
  error_message: string | null;
  id: Generated<number>;
  local_revision: number;
  record_count: number;
  remote_revision: number;
  started_at: TimestampColumn;
  status: string;
  uuid: string;
};

export type CodeLogicXSyncConflictsTable = {
  created_at: TimestampColumn;
  details_json: string;
  id: Generated<number>;
  local_version: number;
  record_uuid: string;
  remote_version: number;
  resolved_at: TimestampColumn | null;
  status: string;
  table_name: string;
  uuid: string;
};
