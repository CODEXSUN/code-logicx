export type IdeaAttachment = { dataUrl: string; ideaUuid: string; mimeType: string; name: string; sizeBytes: number; uuid: string };
export type IdeaPoll = { multipleChoice: boolean; options: Array<{ id: string; label: string; votes: number }>; question: string; uuid: string };
export type Idea = { attachments: IdeaAttachment[]; author: string; category: string; commentCount: number; contentHtml: string; createdAt: string; drawing: IdeaScene | null; excerpt: string; likes: number; poll: IdeaPoll | null; projectUuids: string[]; status: string; tags: string[]; title: string; updatedAt: string; uuid: string };
export type IdeaComment = { author: string; bodyHtml: string; createdAt: string; ideaUuid: string; likes: number; parentUuid: string | null; updatedAt: string; uuid: string };
export type IdeaScene = { appState?: Record<string, unknown>; elements: unknown[]; files?: Record<string, unknown> };
export type IdeaInput = Pick<Idea, "category" | "contentHtml" | "excerpt" | "projectUuids" | "status" | "tags" | "title">;
