type Statement = {
  bind(...values: (string | number)[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{results: T[]}>;
  run(): Promise<unknown>;
};
export interface RecoveryDatabase {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown>;
}

export type Account = {
  id: string;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  suspended: boolean;
  requiresTwoFactor: boolean;
};

export interface RecoveryDependencies {
  db: RecoveryDatabase;
  accounts: {
    byEmail(email: string): Promise<Account | null>;
    byId(id: string): Promise<Account | null>;
  };
  delivery: { send(email: string, token: string): Promise<void> };
  now?: () => number;
}

const tokenLifetime = 10 * 60_000;
const sessionLifetime = 8 * 60 * 60_000;

function hex(bytes: Uint8Array) {
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}
const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const digest = async (value: string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
const validToken = (value: string) => /^[0-9a-f]{64}$/.test(value);
const eligible = (account: Account | null): account is Account =>
  !!account && account.role === 'buyer' && !account.suspended && !account.requiresTwoFactor;

export function createRecoveryService({ db, accounts, delivery, now = Date.now }: RecoveryDependencies) {
  async function permit(bucket: string, time: number, max: number) {
    const window = Math.floor(time / tokenLifetime);
    return db.prepare(`INSERT INTO recovery_limits (bucket, window, attempts) VALUES (?, ?, 1)
      ON CONFLICT(bucket) DO UPDATE SET window = excluded.window,
      attempts = CASE WHEN recovery_limits.window = excluded.window THEN recovery_limits.attempts + 1 ELSE 1 END
      WHERE recovery_limits.window < excluded.window OR recovery_limits.attempts < ?
      RETURNING attempts`).bind(await digest(bucket), window, max).first();
  }

  return {
    // clientKey must come from a trusted ingress, never a caller-supplied header.
    async request(email: string, clientKey: string): Promise<void> {
      const address = email.trim().toLowerCase();
      const time = now();
      if (!clientKey || !(await permit('client:' + clientKey, time, 20))) return;
      if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return;
      if (!(await permit('email:' + address, time, 3))) return;
      const account = await accounts.byEmail(address);
      if (!eligible(account) || account.email.trim().toLowerCase() !== address) return;
      const token = randomToken();
      const hash = await digest(token);
      await db.prepare(`INSERT INTO recovery_tokens (hash, account_id, email_hash, expires) VALUES (?, ?, ?, ?)
        ON CONFLICT(account_id) DO UPDATE SET hash = excluded.hash, email_hash = excluded.email_hash, expires = excluded.expires`)
        .bind(hash, account.id, await digest(address), time + tokenLifetime).run();
      try {
        await delivery.send(account.email, token);
      } catch {
        await db.prepare('DELETE FROM recovery_tokens WHERE hash = ?').bind(hash).run();
      }
    },

    async redeem(token: string): Promise<string | null> {
      if (!validToken(token)) return null;
      const time = now();
      const claim = await db.prepare('DELETE FROM recovery_tokens WHERE hash = ? AND expires > ? RETURNING account_id, email_hash')
        .bind(await digest(token), time).first<{ account_id: string; email_hash: string }>();
      if (!claim) return null;
      const account = await accounts.byId(claim.account_id);
      if (!eligible(account) || account.id !== claim.account_id || await digest(account.email.trim().toLowerCase()) !== claim.email_hash) return null;
      const session = randomToken();
      await db.batch([
        db.prepare('DELETE FROM recovery_sessions WHERE account_id = ?').bind(account.id),
        db.prepare('INSERT INTO recovery_sessions VALUES (?, ?, ?)').bind(await digest(session), account.id, time + sessionLifetime),
        db.prepare('INSERT INTO recovery_audit (account_id, event, created) VALUES (?, ?, ?)').bind(account.id, 'buyer_recovery', time),
      ]);
      return session;
    },

    async validate(session: string): Promise<Account | null> {
      if (!validToken(session)) return null;
      const row = await db.prepare('SELECT account_id FROM recovery_sessions WHERE hash = ? AND expires > ?')
        .bind(await digest(session), now()).first<{ account_id: string }>();
      if (!row) return null;
      const account = await accounts.byId(row.account_id);
      return eligible(account) && account.id === row.account_id ? account : null;
    },

    async revoke(session: string): Promise<void> {
      if (!validToken(session)) return;
      await db.prepare('DELETE FROM recovery_sessions WHERE hash = ?').bind(await digest(session)).run();
    },
  };
}
