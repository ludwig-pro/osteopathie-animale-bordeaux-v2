import type { Booking, Job, Settings } from './types.ts';

export const enqueueSql = `INSERT INTO jobs(job_key,kind,payload,created_at) VALUES(?,?,?,?)
ON CONFLICT(job_key) DO UPDATE SET payload=excluded.payload, version=jobs.version+1,
state=CASE WHEN jobs.state='conflict' THEN 'conflict' ELSE 'pending' END,
created_at=CASE WHEN jobs.state IN ('pending','conflict') THEN jobs.created_at ELSE excluded.created_at END,
due_at=0, attempts=CASE WHEN jobs.state='conflict' THEN jobs.attempts ELSE 0 END`;
export function enqueue(
  db: D1Database,
  kind: Job['kind'],
  key: string,
  payload: unknown
) {
  return db
    .prepare(enqueueSql)
    .bind(`${kind}:${key}`, kind, JSON.stringify(payload), Date.now());
}
export async function settings(db: D1Database): Promise<Settings> {
  const value = await db
    .prepare('SELECT * FROM settings WHERE id=1')
    .first<Settings>();
  if (!value) throw new Error('migration_required');
  return value;
}
export async function saveBooking(db: D1Database, booking: Booking) {
  const previous = await db
    .prepare('SELECT data FROM bookings WHERE uri=?')
    .bind(booking.uri)
    .first<{ data: string }>();
  const old: Booking | undefined = previous
    ? JSON.parse(previous.data)
    : undefined;
  if (
    old &&
    (Date.parse(old.updatedAt) > Date.parse(booking.updatedAt) ||
      (old.status === 'canceled' && booking.status !== 'canceled'))
  )
    return;
  const data = JSON.stringify(booking);
  if (previous?.data === data) return;
  const statements = [
    db
      .prepare(
        'INSERT INTO contacts(email,marker) VALUES(?,?) ON CONFLICT(email) DO NOTHING'
      )
      .bind(booking.email, crypto.randomUUID()),
    db
      .prepare(
        `INSERT INTO bookings(uri,event_uri,email,data,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(uri) DO UPDATE SET event_uri=excluded.event_uri,email=excluded.email,data=excluded.data,updated_at=excluded.updated_at`
      )
      .bind(
        booking.uri,
        booking.eventUri,
        booking.email,
        data,
        booking.updatedAt
      ),
    enqueue(db, 'contact', booking.email, { email: booking.email }),
  ];
  if (old && old.email !== booking.email)
    statements.push(enqueue(db, 'contact', old.email, { email: old.email }));
  await db.batch(statements);
}
