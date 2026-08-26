export const CODELOGICX_PACKAGE_VERSION = "1.0.22";

export const codelogicxStackContribution = Object.freeze({
  applicationMode: "client" as const,
  capabilities: Object.freeze({
    api: true,
    database: true,
    web: true
  }),
  compatibility: Object.freeze({
    cxapp: "^1.0.2"
  }),
  contractVersion: 1,
  dependencies: Object.freeze([] as string[]),
  description: "Developer and engineering orchestration workspace.",
  displayName: "CodeLogicX",
  id: "codelogicx",
  packageId: "@codelogicx/codelogicx",
  registrationOrder: Object.freeze(["database", "api", "web"] as const),
  requiredEnvironment: Object.freeze([] as string[]),
  version: CODELOGICX_PACKAGE_VERSION
});
