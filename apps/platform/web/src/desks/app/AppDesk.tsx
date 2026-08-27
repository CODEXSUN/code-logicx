import { Suspense, useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { DatabaseZapIcon, EyeIcon, EyeOffIcon, Settings2Icon, ShieldCheckIcon, SmartphoneIcon } from "lucide-react";
import { codelogicxWebBundle } from "@codelogicx/codelogicx-web";
import { honeyChatClient } from "@codelogicx/codelogicx-web/modules/honey";
import { useNotificationCenter } from "@codelogicx/codelogicx-web/modules/notification";
import { GlobalLoader } from "@codelogicx/ui/components/global-loader";
import { ApplicationLayout } from "@codelogicx/ui/layouts/application-layout";
import type { SidemenuItem } from "@codelogicx/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import type { GlobalSearchItem } from "@codelogicx/ui/blocks/menu/sidemenu/global-search";
import { AuthGate } from "../../shared/auth/AuthGate";
import { getToken, logout } from "../../shared/api/platform-api";
import {
  applicationEntryPath,
  canAccessAdministratorSettings,
  canSelectApplicationTheme
} from "./app-shell-access";
import { UserWorkspace } from "../../modules/user";
import { RoleWorkspace } from "../../modules/role";
import { PermissionWorkspace } from "../../modules/permission";
import { RolePermissionWorkspace } from "../../modules/role-permission";
import { UserProfileWorkspace } from "../../modules/user/user.profile.workspace";
import { ApplicationSettingsWorkspace } from "./application-settings.workspace";
import { addonSwitcherItems, resolveAddonDesk } from "./addon-desks";

type IdentityPage =
  | "identity.users"
  | "identity.roles"
  | "identity.permissions"
  | "identity.access"
  | "identity.profile";

type Claims = { email: string; name?: string; permissions?: string[]; role?: string };

export function AppDesk() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const claims = readClaims();
  const notifications = useNotificationCenter();
  const [honeyVisible, setHoneyVisible] = useState(() => window.localStorage.getItem("codelogicx.screen-companion.visible") !== "false");
  const administrator = canAccessAdministratorSettings(claims.role);
  const identityPage = identityPageFromPath(pathname);
  const workspace = codelogicxWebBundle.resolveWorkspace(pathname);
  const addonDesk = resolveAddonDesk(pathname);
  const showingSettings = pathname.startsWith("/app/settings");
  const settingsPage = pathname === "/app/settings/mobile-connect" ? "mobile-connect" : "clear-cache";
  const invalidIdentityPage = Boolean(
    identityPage && identityPage !== "identity.profile" && !administrator
  );
  const invalidPath = !workspace && !addonDesk && !identityPage && !showingSettings;

  useEffect(() => {
    if (invalidIdentityPage || invalidPath) {
      void navigate({ replace: true, to: applicationEntryPath() });
    }
  }, [invalidIdentityPage, invalidPath, navigate]);

  useEffect(() => {
    if (pathname !== "/app/codelogicx/honey") {
      window.sessionStorage.setItem("codelogicx.honey.last-page", pathname);
    }
  }, [pathname]);

  const showingIdentity = Boolean(identityPage && !invalidIdentityPage);
  const showingGitHub = workspace?.group === "GitHub";
  const headerTitle = showingSettings
      ? settingsPage === "mobile-connect" ? "Mobile Connect" : "Clear cache"
    : showingIdentity
      ? identityTitle(identityPage!)
      : (addonDesk?.workspace.title ?? workspace?.title ?? "Engineering Command Center");
  const globalSearchItems = buildGlobalSearchItems(administrator);
  const brand = addonDesk
    ? {
        logoAlt: addonDesk.title,
        logoDarkSrc: "/logo/logo-dark.svg",
        logoSrc: "/logo/logo.svg",
        subtitle: addonDesk.subtitle,
        title: addonDesk.title
      }
    : {
        logoAlt: "CodeLogicX",
        logoDarkSrc: "/logo/logo-dark.svg",
        logoSrc: "/logo/logo.svg",
        subtitle: "Developer Portal",
        title: "CodeLogicX"
      };

  return (
    <AuthGate>
      <ApplicationLayout
        brand={brand}
        companion={{
          chat: honeyChatClient,
          label: "Honey",
          spriteSheetUrl: "/pets/honey/spritesheet.webp"
        }}
        deskVariant="techmedia"
        globalSearchItems={globalSearchItems}
        headerTitle={headerTitle}
        menuItems={
          addonDesk
            ? addonDesk.menuItems
            : showingIdentity
            ? buildIdentityMenu(identityPage!, navigate, administrator)
            : buildApplicationMenu(workspace?.id ?? "", honeyVisible, navigate, settingsPage, () => {
                const next = !honeyVisible;
                setHoneyVisible(next);
                window.localStorage.setItem("codelogicx.screen-companion.visible", String(next));
                window.dispatchEvent(new CustomEvent("codelogicx:screen-companion-visibility", { detail: next }));
              })
        }
        onLogout={async () => {
          await logout();
          await navigate({ to: "/login" });
        }}
        notifications={notifications.items}
        onNotificationRead={notifications.markRead}
        profileHref="/app/identity/profile"
        showHomeAction={false}
        showSidebarUser={false}
        showThemeAction={canSelectApplicationTheme(claims.role)}
        subtitle={null}
        title={null}
        user={{
          email: claims.email,
          fallback: initials(claims.name ?? claims.email),
          name: claims.name ?? claims.email
        }}
        versionLabel={`v ${__APP_VERSION__}`}
        workspaceItems={[
          codelogicxWebBundle.applicationSwitcherItem(
            Boolean(workspace && !showingIdentity && !showingGitHub)
          ),
          ...addonSwitcherItems(addonDesk?.id),
          codelogicxWebBundle.githubSwitcherItem(showingGitHub),
          ...(administrator
            ? [
                {
                  active: showingIdentity,
                  description: "Local users, roles, and permissions.",
                  icon: ShieldCheckIcon,
                  title: "Platform",
                  url: "/app/identity/users"
                }
              ]
            : [])
        ]}
      >
        <Suspense fallback={<GlobalLoader />}>
          {showingSettings ? (
            <ApplicationSettingsWorkspace page={settingsPage} />
          ) : showingIdentity ? (
            <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-5 py-4 lg:w-[calc(100%-3rem)] lg:py-5">
              {renderIdentityPage(identityPage!, claims.email)}
            </main>
          ) : addonDesk ? (
            <addonDesk.workspace.component />
          ) : workspace ? (
            <workspace.component />
          ) : (
            <GlobalLoader />
          )}
        </Suspense>
      </ApplicationLayout>
    </AuthGate>
  );
}

function buildApplicationMenu(activeWorkspaceId: string, honeyVisible: boolean, navigate: ReturnType<typeof useNavigate>, settingsPage: "clear-cache" | "mobile-connect", toggleHoney: () => void) {
  return [
    ...codelogicxWebBundle.menuItems(activeWorkspaceId),
    {
      icon: Settings2Icon,
      items: [
        { icon: SmartphoneIcon, isActive: settingsPage === "mobile-connect", onSelect: () => void navigate({ to: "/app/settings/mobile-connect" }), title: "Mobile Connect" },
        { icon: DatabaseZapIcon, isActive: settingsPage === "clear-cache", onSelect: () => void navigate({ to: "/app/settings" }), title: "Clear cache" },
        { icon: honeyVisible ? EyeOffIcon : EyeIcon, onSelect: toggleHoney, title: honeyVisible ? "Hide Honey" : "Show Honey" }
      ],
      title: "Settings"
    }
  ];
}

function buildGlobalSearchItems(administrator: boolean): GlobalSearchItem[] {
  const workspaces = codelogicxWebBundle.workspaces.map((entry) => ({
    group: entry.group,
    keywords: [entry.id, "CodeLogicX", "workspace"],
    title: entry.title,
    url: workspaceUrl(entry.id)
  }));
  const addonWorkspaces = [
    { group: "Blog", keywords: ["articles", "publishing"], title: "Blog articles", url: "/app/blog/articles" },
    { group: "File Manager", keywords: ["files", "storage"], title: "File Manager", url: "/app/file-manager/files" },
    { group: "File Manager", keywords: ["upload", "media"], title: "Uploads", url: "/app/file-manager/uploads" }
  ];
  if (!administrator) return [...workspaces, ...addonWorkspaces];
  return [
    ...workspaces,
    ...addonWorkspaces,
    ...[
      ["Users", "users"],
      ["Roles", "roles"],
      ["Permissions", "permissions"],
      ["Access controls", "access"]
    ].map(([title, page]) => ({
      group: "Platform",
      keywords: ["identity", "security"],
      title: title!,
      url: `/app/identity/${page}`
    }))
  ];
}

function workspaceUrl(workspaceId: string) {
  if (workspaceId.startsWith("design-system-")) {
    return `/app/codelogicx/design-system/${workspaceId.replace("design-system-", "")}`;
  }
  return `/app/codelogicx/${workspaceId}`;
}

function renderIdentityPage(page: IdentityPage, actorEmail: string) {
  if (page === "identity.users") return <UserWorkspace actorEmail={actorEmail} />;
  if (page === "identity.roles") return <RoleWorkspace />;
  if (page === "identity.permissions") return <PermissionWorkspace />;
  if (page === "identity.access") return <RolePermissionWorkspace />;
  return <UserProfileWorkspace />;
}

function buildIdentityMenu(
  page: IdentityPage,
  navigate: ReturnType<typeof useNavigate>,
  administrator: boolean
): SidemenuItem[] {
  if (!administrator) return [];
  const item = (title: string, target: IdentityPage) => ({
    isActive: page === target,
    onSelect: () => void navigate({ to: `/app/${target.replaceAll(".", "/")}` }),
    title
  });
  return [
    {
      icon: ShieldCheckIcon,
      isActive: true,
      items: [
        item("Users", "identity.users"),
        item("Roles", "identity.roles"),
        item("Permissions", "identity.permissions"),
        item("Access controls", "identity.access")
      ],
      title: "Platform"
    }
  ];
}

function identityPageFromPath(pathname: string): IdentityPage | null {
  const value = pathname.replace(/^\/app\/?/u, "").replaceAll("/", ".");
  const allowed: IdentityPage[] = [
    "identity.users",
    "identity.roles",
    "identity.permissions",
    "identity.access",
    "identity.profile"
  ];
  return allowed.includes(value as IdentityPage) ? (value as IdentityPage) : null;
}

function identityTitle(page: IdentityPage) {
  return page
    .split(".")
    .at(-1)!
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readClaims(): Claims {
  const token = getToken();
  if (!token) return { email: "" };
  try {
    return JSON.parse(
      atob((token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/"))
    ) as Claims;
  } catch {
    return { email: "" };
  }
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
