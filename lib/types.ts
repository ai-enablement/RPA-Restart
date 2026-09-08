export type RpaTask = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: "active" | "maintenance" | "inactive";
  lastRunAt: string | null;
};
