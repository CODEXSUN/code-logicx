import { defineModule } from "@codelogicx/framework/modules";
import type { CodeLogicXModuleDependencies } from "../../module-dependencies.js";
import { registerTelegramSupportRoutes } from "./telegram-support.routes.js";
export const telegramSupportModule = defineModule<CodeLogicXModuleDependencies>({ key: "codelogicx.telegram-support", label: "Telegram Support", register: ({ app }) => registerTelegramSupportRoutes(app) });
