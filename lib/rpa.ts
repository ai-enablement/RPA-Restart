import { demoTasks } from "./demo-data";
import { getPool } from "./db";
import type { AppUser, RpaTask } from "./types";

export async function getAppUser(email: string): Promise<AppUser | null> {
  if (process.env.USE_DEMO_DATA === "true") {
    return { id: "demo-admin", email, displayName: "Demo Admin", role: "admin" };
  }

  const result = await getPool().query<AppUser>(
    `SELECT id, email, display_name AS "displayName", role
       FROM rpa_restart.app_user
      WHERE lower(email) = lower($1) AND is_active = true`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function getTasksForUser(user: AppUser): Promise<RpaTask[]> {
  if (process.env.USE_DEMO_DATA === "true") return demoTasks;

  const result = user.role === "admin"
    ? await getPool().query<RpaTask>(
        `SELECT r.id, r.name, r.description, r.category, r.status,
                MAX(fr.requested_at)::text AS "lastRunAt"
           FROM rpa_restart.rpa_task r
      LEFT JOIN rpa_restart.flow_run fr ON fr.rpa_task_id = r.id
       GROUP BY r.id, r.name, r.description, r.category, r.status
       ORDER BY r.name`,
      )
    : await getPool().query<RpaTask>(
    `SELECT r.id, r.name, r.description, r.category, r.status,
            MAX(fr.requested_at)::text AS "lastRunAt"
       FROM rpa_restart.app_user u
       JOIN rpa_restart.user_rpa_access a ON a.user_id = u.id
       JOIN rpa_restart.rpa_task r ON r.id = a.rpa_task_id
  LEFT JOIN rpa_restart.flow_run fr ON fr.rpa_task_id = r.id AND fr.requested_by = u.id
      WHERE lower(u.email) = lower($1) AND u.is_active = true
   GROUP BY r.id, r.name, r.description, r.category, r.status
   ORDER BY r.name`,
    [user.email],
  );
  return result.rows;
}

export async function createRpaTask(
  user: AppUser,
  input: { name: string; description: string; category: string; webhookUrl: string | null },
) {
  if (user.role !== "admin") throw new Error("FORBIDDEN");

  const result = await getPool().query<{ id: string }>(
    `INSERT INTO rpa_restart.rpa_task
       (name, description, category, flow_webhook_url)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [input.name, input.description, input.category, input.webhookUrl],
  );
  return result.rows[0];
}

export async function requestRun(email: string, taskId: string) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const allowed = await client.query<{
      user_id: string;
      webhook_url: string | null;
      task_name: string;
    }>(
      `SELECT u.id AS user_id, r.flow_webhook_url AS webhook_url, r.name AS task_name
         FROM rpa_restart.app_user u
         JOIN rpa_restart.user_rpa_access a ON a.user_id = u.id
         JOIN rpa_restart.rpa_task r ON r.id = a.rpa_task_id
        WHERE lower(u.email) = lower($1) AND r.id = $2
          AND u.is_active = true AND r.status = 'active'`,
      [email, taskId],
    );
    if (!allowed.rowCount) throw new Error("FORBIDDEN");

    const run = await client.query<{ id: string }>(
      `INSERT INTO rpa_restart.flow_run (rpa_task_id, requested_by, status)
       VALUES ($1, $2, 'queued') RETURNING id`,
      [taskId, allowed.rows[0].user_id],
    );
    await client.query("COMMIT");

    const webhookUrl = allowed.rows[0].webhook_url || process.env.POWER_AUTOMATE_WEBHOOK_URL;
    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.POWER_AUTOMATE_SHARED_SECRET
            ? { "x-rpa-secret": process.env.POWER_AUTOMATE_SHARED_SECRET }
            : {}),
        },
        body: JSON.stringify({ runId: run.rows[0].id, taskId, requestedBy: email }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("FLOW_REQUEST_FAILED");
    }
    return run.rows[0];
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
