import { defineModule } from "@codelogicx/framework/modules";
import type { CodeLogicXModuleDependencies } from "../../module-dependencies.js";
import { registerSyncRoutes } from "./sync.routes.js";

export const syncModule = defineModule<CodeLogicXModuleDependencies>({
  key: "codelogicx.sync",
  label: "CodeLogicX Cloud Sync",
  register: ({ app }) => registerSyncRoutes(app)
});
