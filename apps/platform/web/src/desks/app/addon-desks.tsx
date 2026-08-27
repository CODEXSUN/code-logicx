import type { BlogsEditorHost } from "@codexsun/blog/web";
import type { SidemenuItem } from "@codelogicx/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import type { TopMenuWorkspaceItem } from "@codelogicx/ui/blocks/menu/sidemenu/top-menu";
import {
  FileIcon,
  FilesIcon,
  FolderOpenIcon,
  HardDriveIcon,
  LayoutDashboardIcon,
  NewspaperIcon,
  Settings2Icon,
  UploadIcon
} from "lucide-react";
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { getToken } from "../../shared/api/platform-api";

type AddonWorkspace = {
  component: LazyExoticComponent<ComponentType>;
  id: string;
  title: string;
};

export type AddonDesk = {
  id: "blog" | "file-manager";
  rootPath: string;
  subtitle: string;
  title: string;
  workspace: AddonWorkspace;
  menuItems: SidemenuItem[];
};

const loadFileManager = () =>
  import("@codexsun/file-manager/web").then((module) => {
    module.configureFileManagerClient({
      baseUrl: "/api/platform/file-manager",
      headers: () => {
        const token = getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      }
    });
    return module;
  });

const blogHost: BlogsEditorHost = {
  listAuthors: async () => [],
  listImages: async () => {
    const fileManager = await loadFileManager();
    return (await fileManager.listFilesInArea("public", "blog"))
      .filter((file) => file.mimeType.startsWith("image/"))
      .map(({ mimeType, name, url, uuid }) => ({
        mimeType,
        name,
        url: fileManager.resolveFileManagerUrl(url),
        uuid
      }));
  },
  uploadImage: async (file) => {
    const fileManager = await loadFileManager();
    const uploaded = await fileManager.uploadFileToArea(file, "public", "blog");
    return {
      mimeType: uploaded.mimeType,
      name: uploaded.name,
      url: fileManager.resolveFileManagerUrl(uploaded.url),
      uuid: uploaded.uuid
    };
  }
};

const BlogWorkspace = lazy(async () => {
  const module = await import("@codexsun/blog/web");
  module.configureBlogsEditorClient({
    headers: () => {
      const token = getToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
  });
  return { default: () => <module.BlogsEditorWorkspace host={blogHost} /> };
});
const FileManagerOverview = lazyWorkspace(() =>
  loadFileManager().then((module) => module.FileManagerOverviewWorkspace)
);
const FileManagerFiles = lazyWorkspace(() =>
  loadFileManager().then((module) => module.FileBrowserWorkspace)
);
const FileManagerUploads = lazyWorkspace(() =>
  loadFileManager().then((module) => module.FileManagerUploadsWorkspace)
);
const FileManagerStorage = lazyWorkspace(() =>
  loadFileManager().then((module) => module.StorageConnectionsWorkspace)
);
const FileManagerSettings = lazyWorkspace(() =>
  loadFileManager().then((module) => module.FileManagerSettingsWorkspace)
);

const fileManagerWorkspaces: Record<string, AddonWorkspace> = {
  overview: { component: FileManagerOverview, id: "overview", title: "Overview" },
  files: { component: FileManagerFiles, id: "files", title: "Files" },
  uploads: { component: FileManagerUploads, id: "uploads", title: "Uploads" },
  storage: { component: FileManagerStorage, id: "storage", title: "Storage" },
  settings: { component: FileManagerSettings, id: "settings", title: "Settings" }
};

export function resolveAddonDesk(pathname: string): AddonDesk | null {
  if (pathname.startsWith("/app/blog")) return blogDesk(pathname);
  if (pathname.startsWith("/app/file-manager")) return fileManagerDesk(pathname);
  return null;
}

export function addonSwitcherItems(activeDeskId?: AddonDesk["id"]): TopMenuWorkspaceItem[] {
  return [
    {
      active: activeDeskId === "blog",
      description: "Write and publish CodeLogicX content.",
      icon: NewspaperIcon,
      title: "Blog",
      url: "/app/blog/articles"
    },
    {
      active: activeDeskId === "file-manager",
      description: "Manage application files and storage.",
      icon: FolderOpenIcon,
      title: "File Manager",
      url: "/app/file-manager/files"
    }
  ];
}

function blogDesk(pathname: string): AddonDesk {
  return {
    id: "blog",
    menuItems: [
      {
        icon: FileIcon,
        isActive: pathname === "/app/blog" || pathname === "/app/blog/articles",
        title: "Articles",
        url: "/app/blog/articles"
      }
    ],
    rootPath: "/app/blog/articles",
    subtitle: "Publishing Desk",
    title: "Blog",
    workspace: { component: BlogWorkspace, id: "articles", title: "Articles" }
  };
}

function fileManagerDesk(pathname: string): AddonDesk {
  const section = pathname.split("/").filter(Boolean)[2] ?? "overview";
  const workspace = fileManagerWorkspaces[section] ?? fileManagerWorkspaces.overview!;
  const item = (title: string, id: string, icon: typeof FilesIcon): SidemenuItem => ({
    icon,
    isActive: workspace.id === id,
    title,
    url: `/app/file-manager/${id}`
  });
  return {
    id: "file-manager",
    menuItems: [
      item("Overview", "overview", LayoutDashboardIcon),
      item("Files", "files", FilesIcon),
      item("Uploads", "uploads", UploadIcon),
      item("Storage", "storage", HardDriveIcon),
      item("Settings", "settings", Settings2Icon)
    ],
    rootPath: "/app/file-manager/overview",
    subtitle: "Storage Desk",
    title: "File Manager",
    workspace
  };
}

function lazyWorkspace(loader: () => Promise<ComponentType>) {
  return lazy(async () => ({ default: await loader() }));
}
