import { defineModule } from "@codelogicx/framework/modules";
import type { CodeLogicXModuleDependencies } from "../../module-dependencies.js";
import { registerMessagingRoutes } from "./messaging.routes.js";

export const messagingModule = defineModule<CodeLogicXModuleDependencies>({
  key: "codelogicx.messaging",
  label: "Messenger",
  register({ app }) { return registerMessagingRoutes(app); }
});
