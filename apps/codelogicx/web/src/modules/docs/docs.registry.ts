import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type DocPage = {
  component: LazyExoticComponent<ComponentType>;
  description: string;
  group: string;
  slug: string;
  sourcePath: string;
  title: string;
};

const page = (
  slug: string,
  title: string,
  description: string,
  group: string,
  load: () => Promise<{ default: ComponentType }>,
  sourcePath = `apps/codelogicx/web/src/modules/docs/content/${slug}.mdx`
): DocPage => ({ component: lazy(load), description, group, slug, sourcePath, title });

export const docsPages = [
  page(
    "architecture",
    "Architecture",
    "Understand the CodeLogicX engineering platform structure.",
    "Foundation",
    () => import("./content/architecture.mdx")
  ),
  page(
    "product-structure",
    "Product structure",
    "Understand product ownership and shared platform boundaries.",
    "Foundation",
    () => import("./content/product-structure.mdx")
  ),
  page(
    "changelog",
    "ChangeLog",
    "Read the CodeLogicX release history and verification notes.",
    "Foundation",
    () => import("../../../../../../assist/documentation/CHANGELOG.md"),
    "assist/documentation/CHANGELOG.md"
  ),
  page(
    "production-deployment",
    "Production deployment",
    "Update a production checkout that contains reviewed local patches.",
    "Operations",
    () => import("./content/production-deployment.mdx")
  )
] as const;

export function findDocPage(slug: string | null) {
  return docsPages.find((entry) => entry.slug === slug) ?? docsPages[0];
}
