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
