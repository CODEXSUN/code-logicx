import { defineModule } from "@codelogicx/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerUserRoleRoutes } from "./user-role.routes.js";
export const userRoleModule = defineModule<PlatformModuleDependencies>({
  key: "identity.user-role",
  label: "User Roles",
  register: ({ app }) => registerUserRoleRoutes(app)
});
