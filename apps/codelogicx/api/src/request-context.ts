import { AsyncLocalStorage } from "node:async_hooks";

export type CodeLogicXActor = {
  email?: string;
  id: string;
  permissions: readonly string[];
  roles: readonly string[];
};

export type CodeLogicXUserReference = {
  email: string;
  id: number;
  name: string;
  uuid: string;
};

export type CodeLogicXUserDirectory = {
  find(id: number): Promise<CodeLogicXUserReference | null>;
  list(): Promise<CodeLogicXUserReference[]>;
};

const actorContext = new AsyncLocalStorage<CodeLogicXActor>();
const userDirectoryContext = new AsyncLocalStorage<CodeLogicXUserDirectory>();

export function runWithCodeLogicXActor<T>(actor: CodeLogicXActor, callback: () => T) {
  return actorContext.run(actor, callback);
}

export function requireCodeLogicXActor() {
  const actor = actorContext.getStore();
  if (!actor) throw new Error("CodeLogicX requires a CXApp-provided actor.");
  return actor;
}

export function runWithCodeLogicXUserDirectory<T>(
  directory: CodeLogicXUserDirectory,
  callback: () => T
) {
  return userDirectoryContext.run(directory, callback);
}

export function requireCodeLogicXUserDirectory() {
  const directory = userDirectoryContext.getStore();
  if (!directory) throw new Error("CodeLogicX requires a host-provided user directory.");
  return directory;
}
