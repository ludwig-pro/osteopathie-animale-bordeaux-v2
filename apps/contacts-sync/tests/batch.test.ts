import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.ts';
import { database, environment, upstream, booking } from './helpers.ts';
import { saveBooking } from '../src/store.ts';

test('scheduled batches remain bounded, read-only in simulation, and obey pause', async () => {
  const t = database();
  const remote = upstream();
  const original = globalThis.fetch;
  globalThis.fetch = remote.fetcher as typeof fetch;
  try {
    t.sqlite.exec(
      `UPDATE settings SET mode='simulate',next_scan=${Date.now() + 86400000}`
    );
    for (let n = 0; n < 25; n++)
      await saveBooking(
        t.db,
        booking(`batch-${n}`, { email: `fake-${n}@example.test` })
      );
    await worker.scheduled({} as ScheduledController, environment(t.db));
    const done = t.sqlite
      .prepare("SELECT count(*) AS n FROM jobs WHERE state='done'")
      .get()!.n;
    assert.ok(Number(done) > 1 && Number(done) <= 30);
    assert.equal(
      remote.calls.filter(
        (c) => c.url.hostname === 'people.googleapis.com' && c.method !== 'GET'
      ).length,
      0
    );
    t.sqlite.exec("UPDATE settings SET mode='paused'");
    const calls = remote.calls.length;
    await worker.scheduled({} as ScheduledController, environment(t.db));
    assert.equal(remote.calls.length, calls);
  } finally {
    globalThis.fetch = original;
    t.sqlite.close();
  }
});
