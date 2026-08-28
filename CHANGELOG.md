# Changelog

All notable changes to **logicx_code** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.94] - 2026-08-28

### Changed

- Kept GitHub Releases as the only desktop update source.
- Kept the updater manifest at the GitHub release `latest.json` endpoint.
- Kept MSI downloads under the `desktop-v<version>` GitHub release tag.
- Removed the cloud desktop release uploader and cloud release API from the release workflow.
- Updated web, API, desktop, and mobile version metadata to `1.0.94`.

### Security

- Tauri verifies each downloaded MSI with the configured updater public key.
- The desktop app requires user approval before it installs and restarts.
- Windows can request administrator permission during installation.

### Verification

- Passed API, web, and desktop TypeScript and ESLint checks before the version update.
- Passed the 1.0.93 GitHub-only desktop release artifact check.
- Confirmed that the generated manifest used the `desktop-v1.0.93` GitHub release URL.
- The 1.0.94 desktop artifacts and GitHub release are not built or published yet.

## [1.0.93] - 2026-08-28

### Changed

- Desktop clients now check the official GitHub release `latest.json` endpoint.
- Desktop release manifests now download installers from the `desktop-v<version>` GitHub tag.
- Windows installation remains user-confirmed and can request administrator permission.
- Updated web, API, desktop, and mobile version metadata to `1.0.93`.

### Security

- Tauri verifies every downloaded updater artifact with the configured public key.
- Installation starts only after explicit user confirmation.

### Verification

- Passed API, web, and desktop TypeScript checks.
- Passed deployment and unified-version checks.
- Built and validated the MSI, setup launcher, updater signature, and GitHub release manifest.
- A trusted Authenticode certificate is not installed on this build machine; Windows publisher
  trust remains unavailable until a certificate is supplied.

## [1.0.92] - 2026-08-28

### Added

- Added Connect Service pages to the web application and Desktop IDE.
- Added one-time service pairing routes for desktop clients.
- Added rotating web pairing codes, QR codes, and bridge URLs.
- Added desktop bridge status, verification, and disconnect controls.
- Added a native Tauri HTTP bridge for cloud requests.

### Changed

- Pairing tickets now use the API and web origins from the active environment.
- Local development supports web, API, and desktop connections on one computer.
- Production desktop requests no longer depend on browser CORS support.
- Updated web, API, desktop, and mobile version metadata to `1.0.92`.

### Security

- One-time bridge tickets expire after one minute and work once.
- Desktop bridge endpoints require HTTPS except for local development addresses.
- Repository paths, local credentials, and agent secrets remain on the desktop device.

### Verification

- Passed API, web, desktop, and Rust checks.
- Created and redeemed a local bridge ticket and verified the connected session.
- Built and checked the Windows MSI, setup launcher, updater signature, and manifests.
- The Windows artifacts do not have an Authenticode certificate.
- The production API and updater files were not deployed during this release build.

## [1.0.91] - 2026-08-28

### Added

- Added an authenticated mobile release endpoint backed by
  `storage/mobile/releases/latest.json`.
- Added an in-app update banner and a manual **Check for updates** action under
  the mobile Settings menu.
- Added the installed application version to the mobile connection splash screen.

### Changed

- Mobile release checks now start only after the paired user session is validated.
- APK download starts only after the user selects the update, followed by the
  standard Android unknown-source permission and package-installer confirmation.
- Aligned the Android package version with web, desktop, API, and mobile version
  `1.0.91` (`versionCode 10091`).

## [1.0.90] - 2026-08-27

### Added

- Created the cloud mobile release artifact `code-logicx-90.apk`.
- Updated the mobile release manifest for version `1.0.90` and version code
  `10090`.
- Added a Production deployment page to Docs with the upstream boundary,
  production-only patch inventory, update procedure, and verification checks.

### Changed

- Updated web, API, desktop, and mobile version metadata to `1.0.90`.
- Updated the Android version code to `10090`.
- Set Docker repository discovery and Agent access to the persistent repository
  volume.
- Added direct Redis adapter and client dependencies to the Platform API.
- Aligned local and production proxy behavior for Blog and File Manager routes.
- Added deployment checks and operator guidance for repository storage and Redis.
- Routed cloud Mobile Connect redemption and session requests through the
  `/api/platform` endpoint.
- Restored the Docs link in the main application sidebar.

### Fixed

- The GitHub Dashboard now returns an empty project list when its workspace root
  is unavailable.
- Blog taxonomy, article, and article-template requests no longer use a
  duplicated API prefix.
- File Manager folder and file requests no longer use a duplicated API prefix.
- The development server no longer opts into the deprecated browser `unload` event.
- Fixed QR pairing on `cx.codexsun.com`. The mobile application no longer tries
  to parse the web server HTML response as JSON.
- Added a clear mobile API routing error when a server returns non-JSON content.

### Security

- Recorded APK SHA-256 checksum
  `f5e4ef0c13a6271018ab75f1105d8c99bf9c955bc9467879dd6ad607a1db38b7`
  in the mobile release manifest.

### Verification

- Passed the focused API and web TypeScript checks, ESLint, and production builds.
- Passed deployment validation, clean install dry run, and whitespace checks.
- Verified that the old cloud pairing route returns HTML and the corrected
  `/api/platform` route returns the platform JSON envelope.
- Built the `1.0.90` cloud APK with pairing bypass disabled.
- Passed the mobile and Platform API TypeScript checks.
- The emulator disconnected before the final APK installation check.
- Production deployment was not part of this release preparation.

## [1.0.89] - 2026-08-27

### Added

- Added an Android update monitor to the CodeLogicX mobile application.
- Added update checks after application startup and when the application returns
  to the foreground.
- Added a cloud update manifest at
  `apps/platform/web/public/mobile/codelogicx-update.json`.
- Added a native Capacitor updater that downloads an APK over HTTPS and opens
  the Android installation confirmation screen.

### Security

- The updater checks the application ID, version, version code and SHA-256 hash
  before it opens the APK installer.
- The updater rejects non-HTTPS APK URLs.
- Android keeps the existing application data during an in-place update.

### Changed

- Updated the Android application to version `1.0.89` with version code `10089`.
- Added the Android permission that allows the application to request package
  installation.
- Aligned messages from the authenticated mobile user on the right side of the
  conversation. Messages from other participants remain on the left side.
- Added a compact timestamp to each mobile message bubble.
### Verification

- Built the debug APK successfully with Capacitor and Gradle.
- Installed the APK as an in-place update on emulator `emulator-5554`.
- Verified version `1.0.89`, version code `10089` and native updater
  registration after startup.

### Notes

- Android shows a system confirmation before it installs an update. Silent
  installation requires a managed device-owner environment.
- Production updates must use the same application ID and signing certificate
  as the installed application.

## [1.0.2] - 2026-08-26

### Added

- **Idea DocType** (`Code LogicX`) — capture record for incoming ideas, named
  `IDEA.#`. Fields: `Date` (mandatory, defaults to today), `Title` (mandatory,
  title field), `Description` (Text Editor, mandatory) and `User` (Link to
  **User**, mandatory, defaults to `__user` so it pre-fills with the logged-in
  user). Date and User are exposed as standard list filters.
- **Project DocType** (`Code LogicX`) — top-level project record, named `PRJ.#`.
  Fields: `Customer` (Link to **Customer**, mandatory), `Title` (mandatory and
  **unique**, title field), `Description` (Text Editor) and `Status` (Link to
  **Project Status**, mandatory, defaults to `New`).
- **Module DocType** (`Code LogicX`) — module under a project, named `MOD.#`.
  Fields: `Project` (Link to **Project**, mandatory), `Title` (mandatory, title
  field), `Description` (Text Editor) and `Status` (Link to **Module Status**,
  mandatory, defaults to `New`).
- **Task DocType** (`Code LogicX`) — work item under a module, named `TASK.#`.
  Fields: `Module` (Link to **Module**, mandatory), `Title` (mandatory, title
  field), `Description` (Text Editor), `Priority` (Select 1—10, defaults to `1`),
  `Assigned To` (Link to **User**) and `Status` (Link to **Task Status**,
  mandatory, defaults to `New`).
- **Action DocType** (`Code LogicX`) — worklog entry against a task, named
  `ACT.#`. Fields: `Task` (Link to **Task**, mandatory) and `Comments` (Text
  Editor, mandatory). No title field — the list view shows the `ACT.#` name.
- **Project Status / Module Status / Task Status DocTypes** (`Code LogicX`) —
  masters backing the `Status` link on Project, Module and Task. Each is
  auto-named from a unique, mandatory `Status Name`. A record named `New` is
  required in each so the `Status` defaults resolve.
- **Code LogicX home workspace**
  (`code_logicx/workspace/code_logicx_home/code_logicx_home.json`) — public
  workspace titled "Home", with a **Home** header carrying shortcuts to Idea,
  Project, Module, Task and Action, and a **Masters** header carrying shortcuts
  to the three status masters.
- **Code LogicX sidebar** (`workspace_sidebar/code_logicx.json`) — links to the
  home workspace and the five main doctypes, plus a collapsible **Masters**
  section with the three status masters as child links.
- **Code LogicX desktop icon** (`desktop_icon/code_logicx.json`) — app icon
  (`code`) linking to `/desk/code-logicx-home`, visible to `System Manager`.

### Notes

- Permissions on every DocType are `System Manager` with full rights
  (read/create/write/delete/select/report/export/email/print/share/import).
- `Project.customer` links to the ERPNext **Customer** doctype, so ERPNext must
  be installed on the site. The **Project** doctype name also collides with
  ERPNext's own Project — the two cannot coexist on one site.
- `desktop_icon/code_logicx.json` points `logo_url` at
  `/assets/logicx_code/logo.png`, which does not exist in `public/` yet.

## [1.0.1] - 2026-08-26

### Added

- Initial app scaffold from `bench new-app logicx_code` — the `Code LogicX`
  module, app metadata and empty hooks.
