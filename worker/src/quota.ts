import { DurableObject } from "cloudflare:workers";

// One Durable Object per account: strongly consistent daily verdict counter + ban flag.
// The Workers rate-limit binding handles bursts; this handles "how many per day".

export type QuotaStatus = { ok: boolean; used: number; limit: number; remaining: number; resetAt: number; banned: boolean };

const today = () => new Date().toISOString().slice(0, 10);
const nextMidnightUtc = () => {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
};

export class Quota extends DurableObject<Record<string, never>> {
  constructor(ctx: DurableObjectState, env: Record<string, never>) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(
        "CREATE TABLE IF NOT EXISTS usage (day TEXT PRIMARY KEY, count INTEGER NOT NULL)",
      );
      this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS flags (name TEXT PRIMARY KEY, value INTEGER NOT NULL)");
    });
  }

  private used(): number {
    const row = this.ctx.storage.sql.exec<{ count: number }>("SELECT count FROM usage WHERE day = ?", today()).toArray()[0];
    return row?.count ?? 0;
  }

  private banned(): boolean {
    const row = this.ctx.storage.sql.exec<{ value: number }>("SELECT value FROM flags WHERE name = 'banned'").toArray()[0];
    return row?.value === 1;
  }

  async status(limit: number): Promise<QuotaStatus> {
    const used = this.used();
    const banned = this.banned();
    return { ok: !banned && used < limit, used, limit, remaining: Math.max(0, limit - used), resetAt: nextMidnightUtc(), banned };
  }

  // Reserve one verdict. Called before hitting Clef so failed/abusive bursts still count.
  async consume(limit: number): Promise<QuotaStatus> {
    const s = await this.status(limit);
    if (!s.ok) return s;
    this.ctx.storage.sql.exec(
      "INSERT INTO usage (day, count) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET count = count + 1",
      today(),
    );
    // Keep only the last week of rows.
    this.ctx.storage.sql.exec("DELETE FROM usage WHERE day < date('now', '-7 day')");
    return { ...s, used: s.used + 1, remaining: s.remaining - 1 };
  }

  // Give the verdict back when Clef itself failed (not the user's fault).
  async refund(): Promise<void> {
    this.ctx.storage.sql.exec("UPDATE usage SET count = MAX(0, count - 1) WHERE day = ?", today());
  }

  async setBanned(banned: boolean): Promise<void> {
    this.ctx.storage.sql.exec(
      "INSERT INTO flags (name, value) VALUES ('banned', ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value",
      banned ? 1 : 0,
    );
  }

  // Account deletion. The object is keyed by a salted hash of the account id and only holds counters,
  // so we drop history but keep today's count + ban flag: delete-and-re-login must not reset the quota.
  async forget(): Promise<void> {
    this.ctx.storage.sql.exec("DELETE FROM usage WHERE day <> ?", today());
  }
}
