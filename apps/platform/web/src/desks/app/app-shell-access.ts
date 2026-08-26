export const standardDeskPath = "/app/codelogicx/dashboard";

export function canAccessAdministratorSettings(role: string | undefined) {
  return role === "admin";
}

export function canSelectApplicationTheme(role: string | undefined) {
  return canAccessAdministratorSettings(role);
}

export function applicationEntryPath() {
  return standardDeskPath;
}
