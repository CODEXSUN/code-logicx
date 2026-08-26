import { AsyncLocalStorage } from "node:async_hooks";

export type CodeLogicXActor = {
  email?: string;
  id: string;
  permissions: readonly string[];
  roles: readonly string[];
};

const actorContext = new AsyncLocalStorage<CodeLogicXActor>();

export function runWithCodeLogicXActor<T>(actor: CodeLogicXActor, callback: () => T) {
  return actorContext.run(actor, callback);
}

export function requireCodeLogicXActor() {
  const actor = actorContext.getStore();
  if (!actor) throw new Error("CodeLogicX requires a CXApp-provided actor.");
  return actor;
}
