import { defineModule } from "@codelogicx/framework/modules";
import type { CodeLogicXModuleDependencies } from "../../module-dependencies.js";
import { registerOrchestrationRoutes } from "./orchestration.routes.js";

export const orchestrationModule = defineModule<CodeLogicXModuleDependencies>({
  key: "codelogicx.orchestration",
  label: "Engineering Orchestration",
  register({ app }) {
    return registerOrchestrationRoutes(app);
  }
});
