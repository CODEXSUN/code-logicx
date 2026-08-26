import { defineModule } from "@codelogicx/framework/modules";
import type { CodeLogicXModuleDependencies } from "../../module-dependencies.js";
import { registerNotificationRoutes } from "./notification.routes.js";

export const notificationModule = defineModule<CodeLogicXModuleDependencies>({
  key: "codelogicx.notification",
  label: "Notifications",
  register: ({ app }) => registerNotificationRoutes(app)
});
