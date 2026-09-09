export type RpaTask = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: "active" | "maintenance" | "inactive";
  lastRunAt: string | null;
  assignedUserCount?: number;
  webhookUrl?: string | null;
  assignedUserEmails?: string[];
};

export type AppUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: "user" | "admin";
};

export type FlowRunHistory = {
  id: string;
  taskName: string;
  requestedByEmail: string;
  status: "queued" | "running" | "succeeded" | "failed";
  triggerType: "restart" | "schedule";
  requestedAt: string;
  completedAt: string | null;
  detail: string | null;
};
