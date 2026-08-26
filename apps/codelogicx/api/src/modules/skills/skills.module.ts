import { defineModule } from "@codelogicx/framework/modules";
import type { CodeLogicXModuleDependencies } from "../../module-dependencies.js";
import { registerSkillsRoutes } from "./skills.routes.js";

export const skillsModule = defineModule<CodeLogicXModuleDependencies>({
  key: "codelogicx.skills",
  label: "Skill Library",
  register: ({ app }) => registerSkillsRoutes(app)
});
