import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { listNotifications, markNotificationRead } from "./notification.services";
import { socketEndpoint } from "../../shared/api/socket-endpoint";

const queryKey = ["codelogicx", "notifications"] as const;

export function useNotificationCenter() {
  const queryClient = useQueryClient();
  const inbox = useQuery({ queryFn: listNotifications, queryKey, refetchInterval: 30_000 });
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey })
  });

  useEffect(() => {
    const token = window.localStorage.getItem("codelogicx_session");
    if (!token) return;
    const socket = io(socketEndpoint(), {
      auth: { token },
      path: "/api/codelogicx/notifications/socket.io",
      transports: ["websocket", "polling"]
    });
    socket.on("notification.created", () => {
      void queryClient.invalidateQueries({ queryKey });
    });
    return () => {
      socket.close();
    };
  }, [queryClient]);

  return {
    items: inbox.data ?? [],
    markRead: (id: string) => markRead.mutate(id)
  };
}
