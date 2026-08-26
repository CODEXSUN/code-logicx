# Module Boundaries

The Platform API composition root registers identity modules, then mounts the public CodeLogicX host
adapter at `/api/codelogicx`. It owns ordering and dependency injection only.

`apps/codelogicx/api` owns Project Manager, Task Manager, Planning, GitHub Dashboard, and Sync routes,
services, repositories, migrations, seeds, and types. `apps/codelogicx/web` owns Today, Projects,
Tasks, Platform Registry, Whiteboards, GitHub Dashboard, Sync, Work Automation, and Design System
workspaces.

The `apps/platform/web` desk composes `codelogicxWebBundle` and retains the local identity-administration
screens. CodeLogicX must not import the Platform host. Proprietary business application modules do not
belong in this repository; CodeLogicX records only their lifecycle links and engineering evidence.
