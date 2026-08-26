import { defineModule } from "@codelogicx/framework/modules";
import type { CodeLogicXModuleDependencies } from "../../module-dependencies.js";
import { registerProjectManagerRoutes } from "./project-manager.routes.js";

export const projectManagerModule = defineModule<CodeLogicXModuleDependencies>({
  key: "codelogicx.project-manager",
  label: "Project Manager",
  register({ app }) {
    return registerProjectManagerRoutes(app);
  }
});
