import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/codelogicx-api";
import type { Idea, IdeaAttachment, IdeaComment, IdeaInput, IdeaPoll, IdeaScene } from "./ideas.types";

export const listIdeas = () => apiGet<Idea[]>("/ideas");
export const getIdea = (uuid: string) => apiGet<Idea>(`/ideas/${uuid}`);
export const createIdea = (input: IdeaInput) => apiPost<Idea>("/ideas", input);
export const updateIdea = (uuid: string, input: Partial<IdeaInput>) => apiPut<Idea>(`/ideas/${uuid}`, input);
export const deleteIdea = (uuid: string) => apiDelete<{ deleted: true; uuid: string }>(`/ideas/${uuid}`);
export const listIdeaComments = (uuid: string) => apiGet<IdeaComment[]>(`/ideas/${uuid}/comments`);
export const createIdeaComment = (uuid: string, bodyHtml: string, parentUuid: string | null) => apiPost<IdeaComment>(`/ideas/${uuid}/comments`, { bodyHtml, parentUuid });
export const toggleIdeaLike = (uuid: string) => apiPost<{ liked: boolean; likes: number }>(`/ideas/${uuid}/like`);
export const toggleCommentLike = (uuid: string) => apiPost<{ liked: boolean; likes: number }>(`/idea-comments/${uuid}/like`);
export const saveIdeaPoll = (uuid: string, input: { multipleChoice: boolean; options: string[]; question: string }) => apiPut<IdeaPoll>(`/ideas/${uuid}/poll`, input);
export const voteIdeaPoll = (uuid: string, optionId: string) => apiPost<IdeaPoll>(`/ideas/${uuid}/poll/votes`, { optionId });
export const uploadIdeaAttachment = (uuid: string, input: { dataUrl: string; name: string; type: string }) => apiPost<IdeaAttachment>(`/ideas/${uuid}/attachments`, input);
export const saveIdeaDrawing = (uuid: string, scene: IdeaScene) => apiPut<{ scene: IdeaScene }>(`/ideas/${uuid}/drawing`, scene);
