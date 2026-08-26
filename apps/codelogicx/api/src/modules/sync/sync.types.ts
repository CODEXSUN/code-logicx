export const CODELOGICX_SYNC_CLOUD_URL = "https://codelogicx.codexsun.com";

export type CodeLogicXSyncRole = "cloud" | "disabled" | "local";
export type CodeLogicXSyncDirection = "inbound" | "local" | "outbound";
export type CodeLogicXSyncState = "conflict" | "deleted" | "pending" | "synchronized";

export type CodeLogicXSyncSnapshot = {
  attachmentData: Record<string, string>;
  instanceId: string;
  protocolVersion: 1;
  publishedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
};

export type CodeLogicXSyncStatus = {
  bound: boolean;
  cloudUrl: typeof CODELOGICX_SYNC_CLOUD_URL;
  conflictCount: number;
  instanceId: string;
  lastError: string | null;
  lastVerifiedAt: string | null;
  lastPulledAt: string | null;
  lastPublishedAt: string | null;
  pendingRecords: number;
  remoteRevision: number;
  role: CodeLogicXSyncRole;
  status: "bound" | "conflict" | "disabled" | "error" | "unbound";
};

export type CodeLogicXSyncTokenSummary = {
  createdAt: string;
  createdBy: string;
  label: string;
  lastUsedAt: string | null;
  status: "active" | "revoked";
  uuid: string;
};

export type CodeLogicXSyncResult = {
  direction: "pull" | "push";
  records: number;
  revision: number;
  synchronizedAt: string;
};
