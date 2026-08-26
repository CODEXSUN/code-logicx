import { apiGet, apiPut } from "../../shared/api/codelogicx-api";
import type { CodeLogicXNotification } from "./notification.types";

export const listNotifications = () => apiGet<CodeLogicXNotification[]>("/notifications");
export const markNotificationRead = (id: string) =>
  apiPut<CodeLogicXNotification>(`/notifications/${id}/read`);
