import { defineModule } from "@codelogicx/framework/modules";
import type { CodeLogicXModuleDependencies } from "../../module-dependencies.js";
import { registerPlanningRoutes } from "./planning.routes.js";

export const planningModule = defineModule<CodeLogicXModuleDependencies>({
  key: "codelogicx.planning",
  label: "Planning",
  register: ({ app }) => registerPlanningRoutes(app),
});
