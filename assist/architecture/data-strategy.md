# Data Strategy

CodeLogicX uses one MariaDB database selected by `DB_NAME`.

Platform owns `users`, `roles`, `permissions`, `user_roles`, and `role_permissions`. CodeLogicX modules
own all `codelogicx_*` product, attachment, planning, activity, and synchronization tables.
`schema_migrations` is the shared lifecycle journal and records the owning package where available.

Project Manager and Task Manager start with empty MariaDB tables. Users create and update all
records through the module APIs. CodeLogicX does not use a JSON database or boot-time product seeds.
CodeLogicX product records carry sync direction, status, version, and update timestamps. Attachment
binaries live beneath `CODELOGICX_STORAGE_PATH`; metadata and checksums remain in MariaDB.

Authentication uses local password hashes and persisted role assignments. Database names and
endpoints come only from `.env`. Destructive reset remains explicitly guarded.
