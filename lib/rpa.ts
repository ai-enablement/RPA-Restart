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
                MAX(fr.requested_at)::text AS "lastRunAt",
                COUNT(DISTINCT a.user_id)::int AS "assignedUserCount",
                r.flow_webhook_url AS "webhookUrl",
                COALESCE(array_agg(DISTINCT au.email) FILTER (WHERE au.email IS NOT NULL), '{}') AS "assignedUserEmails"
           FROM rpa_restart.rpa_task r
      LEFT JOIN rpa_restart.flow_run fr ON fr.rpa_task_id = r.id
      LEFT JOIN rpa_restart.user_rpa_access a ON a.rpa_task_id = r.id
      LEFT JOIN rpa_restart.app_user au ON au.id = a.user_id
       GROUP BY r.id, r.name, r.description, r.category, r.status, r.flow_webhook_url
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

export async function updateRpaTask(
  user: AppUser,
  taskId: string,
  input: {
    name: string;
    description: string;
    category: string;
    webhookUrl: string | null;
    userEmails: string[];
  },
) {
  if (user.role !== "admin") throw new Error("FORBIDDEN");

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE rpa_restart.rpa_task
          SET name = $2, description = $3, category = $4,
              flow_webhook_url = $5, updated_at = now()
        WHERE id = $1
        RETURNING id`,
      [taskId, input.name, input.description, input.category, input.webhookUrl],
    );
    if (!updated.rowCount) throw new Error("NOT_FOUND");

    await client.query(
      `INSERT INTO rpa_restart.app_user (email)
       SELECT unnest($1::text[])
       ON CONFLICT (email) DO UPDATE SET is_active = true`,
      [input.userEmails],
    );
    await client.query(
      `DELETE FROM rpa_restart.user_rpa_access WHERE rpa_task_id = $1`,
      [taskId],
    );
    await client.query(
      `INSERT INTO rpa_restart.user_rpa_access (user_id, rpa_task_id)
       SELECT id, $2 FROM rpa_restart.app_user WHERE email = ANY($1::text[])`,
      [input.userEmails, taskId],
    );
    await client.query("COMMIT");
    return { id: taskId };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function createRpaTask(
  user: AppUser,
  input: {
    name: string;
    description: string;
    category: string;
    webhookUrl: string | null;
    userEmails: string[];
  },
) {
  if (user.role !== "admin") throw new Error("FORBIDDEN");

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: string }>(
      `INSERT INTO rpa_restart.rpa_task
         (name, description, category, flow_webhook_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [input.name, input.description, input.category, input.webhookUrl],
    );
    const taskId = result.rows[0].id;

    await client.query(
      `INSERT INTO rpa_restart.app_user (email)
       SELECT unnest($1::text[])
       ON CONFLICT (email) DO UPDATE SET is_active = true`,
      [input.userEmails],
    );
    await client.query(
      `INSERT INTO rpa_restart.user_rpa_access (user_id, rpa_task_id)
       SELECT id, $2 FROM rpa_restart.app_user WHERE email = ANY($1::text[])
       ON CONFLICT (user_id, rpa_task_id) DO NOTHING`,
      [input.userEmails, taskId],
    );
    await client.query("COMMIT");
    return { id: taskId };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
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
    const runId = run.rows[0].id;
    const webhookUrl = allowed.rows[0].webhook_url || process.env.POWER_AUTOMATE_WEBHOOK_URL;
    if (!webhookUrl) {
      await pool.query(
        `UPDATE rpa_restart.flow_run SET status = 'failed', completed_at = now(), detail = $2 WHERE id = $1`,
        [runId, "Flow URL이 등록되지 않았습니다."],
      );
      throw new Error("FLOW_URL_MISSING");
    }
    try {
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
      if (!response.ok) {
        const responseText = (await response.text().catch(() => "")).slice(0, 1000);
        throw new Error(`FLOW_HTTP_${response.status}${responseText ? `: ${responseText}` : ""}`);
      }
      await pool.query(
        `UPDATE rpa_restart.flow_run SET status = 'succeeded', completed_at = now(), detail = $2 WHERE id = $1`,
        [runId, `Power Automate 응답 ${response.status}`],
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "FLOW_REQUEST_FAILED";
      await pool.query(
        `UPDATE rpa_restart.flow_run SET status = 'failed', completed_at = now(), detail = $2 WHERE id = $1`,
        [runId, detail.slice(0, 1000)],
      );
      throw error;
    }
    return run.rows[0];
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
