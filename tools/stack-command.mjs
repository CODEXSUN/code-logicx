#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const command = process.argv[2];
const supported = new Set(["build", "typecheck", "lint"]);

if (!command || !supported.has(command)) {
  console.error("Usage: node tools/stack-command.mjs <build|typecheck|lint>");
  process.exit(1);
}

const packages = ["@codelogicx/framework", "@codelogicx/ui"];

for (const packageName of packages) {
  runNpm(["run", command, "--if-present", "--workspace", packageName]);
}

runNpm(["run", command, "--workspace", "@codelogicx/codelogicx-api"]);
if (command === "typecheck") {
  runNpm(["run", "build", "--workspace", "@codelogicx/codelogicx-api"]);
}
runNpm(["run", command, "--workspace", "@codelogicx/codelogicx-web"]);
runNpm(["run", command, "--workspace", "@codelogicx/platform-api"]);
runNpm(["run", command, "--workspace", "@codelogicx/platform-web"]);
runNpm(["run", command, "--workspace", "@codelogicx/desktop"]);

function runNpm(args) {
  const executable = process.env.npm_execpath ? process.execPath : "npm";
  const commandArgs = process.env.npm_execpath ? [process.env.npm_execpath, ...args] : args;
  const result = spawnSync(executable, commandArgs, { cwd: root, stdio: "inherit" });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
