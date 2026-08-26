import { defineModule } from "@codelogicx/framework/modules";
import type { CodeLogicXModuleDependencies } from "../../module-dependencies.js";
import { registerGithubDashboardRoutes } from "./github-dashboard.routes.js";

export const githubDashboardModule = defineModule<CodeLogicXModuleDependencies>({
  key: "codelogicx.github-dashboard",
  label: "GitHub Dashboard",
  register: ({ app }) => registerGithubDashboardRoutes(app),
});
