#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import { delimiter, join } from "node:path";

const host = "127.0.0.1";
const port = 1520;

if (await hasListener(host, port) && hasDesktopProcess()) {
  console.log(`CodeLogicX desktop is already running at http://${host}:${port}. Reusing the active development service.`);
  process.exit(0);
}

const command = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npm";
const args = process.platform === "win32"
  ? ["/d", "/s", "/c", "npm.cmd", "run", "tauri:dev", "--workspace", "@codelogicx/desktop"]
  : ["run", "tauri:dev", "--workspace", "@codelogicx/desktop"];
const child = spawn(command, args, { env: desktopEnvironment(), stdio: "inherit" });

child.once("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

function hasListener(address, targetPort) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: address, port: targetPort });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

function hasDesktopProcess() {
  if (process.platform !== "win32") return false;
  const output = execFileSync("tasklist", ["/FI", "IMAGENAME eq CodeLogicX.exe", "/NH"], { encoding: "utf8" });
  return output.includes("CodeLogicX.exe");
}

function desktopEnvironment() {
  if (process.platform !== "win32") return process.env;

  const cargoBin = join(process.env.USERPROFILE ?? "", ".cargo", "bin");
  if (!existsSync(join(cargoBin, "cargo.exe"))) {
    console.error("CodeLogicX desktop requires Rust. Install it with: winget install --id Rustlang.Rustup");
    process.exit(1);
  }

  return {
    ...process.env,
    PATH: `${cargoBin}${delimiter}${process.env.PATH ?? ""}`
  };
}
