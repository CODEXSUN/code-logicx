import { defineModule } from "@codelogicx/framework/modules";
import type { CodeLogicXModuleDependencies } from "../../module-dependencies.js";
import { registerTaskManagerRoutes } from "./task-manager.routes.js";
export const taskManagerModule = defineModule<CodeLogicXModuleDependencies>({
  key: "codelogicx.task-manager",
  label: "Todo's",
  register({ app }) {
    return registerTaskManagerRoutes(app);
  }
});
