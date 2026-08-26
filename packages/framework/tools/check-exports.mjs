const publicExports = [
  "@codelogicx/framework",
  "@codelogicx/framework/api",
  "@codelogicx/framework/config",
  "@codelogicx/framework/db",
  "@codelogicx/framework/env",
  "@codelogicx/framework/errors",
  "@codelogicx/framework/events",
  "@codelogicx/framework/health",
  "@codelogicx/framework/http",
  "@codelogicx/framework/logger",
  "@codelogicx/framework/modules",
  "@codelogicx/framework/queue",
  "@codelogicx/framework/storage"
];

for (const publicExport of publicExports) {
  await import(publicExport);
}

console.info(`Framework export check passed for ${publicExports.length} public entry points.`);
