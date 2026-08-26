export type IdeaInput = {
  category: string;
  contentHtml: string;
  excerpt: string;
  projectUuids: string[];
  status: string;
  tags: string[];
  title: string;
};

export type PollInput = { multipleChoice: boolean; options: string[]; question: string };
