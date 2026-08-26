import { defineModule } from "@codelogicx/framework/modules";
import type { CodeLogicXModuleDependencies } from "../../module-dependencies.js";
import { registerIdeasRoutes } from "./ideas.routes.js";

export const ideasModule = defineModule<CodeLogicXModuleDependencies>({ key: "codelogicx.ideas", label: "Ideas", register: ({ app }) => registerIdeasRoutes(app) });
