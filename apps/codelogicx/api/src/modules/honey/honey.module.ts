import { defineModule } from "@codelogicx/framework/modules";
import type { CodeLogicXModuleDependencies } from "../../module-dependencies.js";
import { registerHoneyRoutes } from "./honey.routes.js";

export const honeyModule = defineModule<CodeLogicXModuleDependencies>({
  key: "codelogicx.honey", label: "Honey Assistant", register: ({ app }) => registerHoneyRoutes(app)
});
