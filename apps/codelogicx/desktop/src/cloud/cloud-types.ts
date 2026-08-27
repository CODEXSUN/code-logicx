export type CloudSession = {
  email: string;
  expiresAt: string;
  name?: string;
  role?: string;
};

export type CloudIdea = {
  category: string;
  commentCount: number;
  excerpt: string;
  referenceNumber: number;
  status: string;
  tags: string[];
  title: string;
  updatedAt: string;
  uuid: string;
};

export type CloudProject = {
  description: string;
  id: string;
  priority: string;
  status: string;
  title: string;
  updatedAt: string;
};

export type CloudTask = {
  description: string;
  dueDate: string;
  id: string;
  priority: string;
  status: string;
  title: string;
  updatedAt: string;
};

export type CloudConversation = {
  id: string;
  lastMessage: { content: string; createdAt: string; senderName: string } | null;
  members: Array<{ email: string; name: string; uuid: string }>;
  title: string;
  unreadCount: number;
  updatedAt: string;
};

export type CloudData = {
  conversations: CloudConversation[];
  ideas: CloudIdea[];
  projects: CloudProject[];
  tasks: CloudTask[];
};

export type CloudPage = "dashboard" | "ideas" | "messages" | "projects" | "tasks";
