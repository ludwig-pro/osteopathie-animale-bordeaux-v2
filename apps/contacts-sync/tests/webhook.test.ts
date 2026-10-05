import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import worker from '../src/index.ts';
import { validSignature } from '../src/webhook.ts';
import { database, environment, booking } from './helpers.ts';
const sign = (body: string, t = String(Math.floor(Date.now() / 1000))) =>
  `t=${t},v1=${createHmac('sha256', 'fake-signing-key').update(`${t}.${body}`).digest('hex')}`;
const request = (body: string, signature = sign(body)) =>
  new Request('https://worker.test/webhooks/calendly', {
    method: 'POST',
    headers: { 'Calendly-Webhook-Signature': signature },
    body,
  });

test('valid signature requires exact body, timestamp and secret', async () => {
  assert.equal(
    await validSignature('{}', sign('{}'), 'fake-signing-key'),
    true
  );
  assert.equal(
    await validSignature('{ }', sign('{}'), 'fake-signing-key'),
    false
  );
  assert.equal(
    await validSignature('{}', sign('{}', '1'), 'fake-signing-key'),
    false
  );
  assert.equal(
    await validSignature(
      '{}',
      sign('{}', String(Math.floor(Date.now() / 1000) + 999)),
      'fake-signing-key'
    ),
    false
  );
  assert.equal(await validSignature('{}', sign('{}'), 'wrong'), false);
});
test('signed duplicate webhook is durably coalesced and never stores invitee answers', async () => {
  const { db, sqlite } = database(),
    env = environment(db);
  const body = JSON.stringify({
    event: 'invitee.created',
    payload: {
      uri: booking().uri,
      email: 'private@example.com',
      questions_and_answers: [{ answer: 'private-answer' }],
    },
  });
  assert.equal((await worker.fetch(request(body), env)).status, 202);
  assert.equal((await worker.fetch(request(body), env)).status, 202);
  const rows = sqlite.prepare('SELECT * FROM jobs').all();
  assert.equal(rows.length, 1);
  assert.doesNotMatch(JSON.stringify(rows), /private/);
});
test('invalid signature, host injection, oversized bodies and unknown routes cannot create jobs', async () => {
  const { db, sqlite } = database(),
    env = environment(db);
  assert.equal((await worker.fetch(request('{}', 'invalid'), env)).status, 401);
  const body = JSON.stringify({
    event: 'invitee.created',
    payload: { uri: 'https://attacker.test/invitees/1' },
  });
  assert.equal((await worker.fetch(request(body), env)).status, 400);
  assert.equal(
    (await worker.fetch(request('x'.repeat(262145)), env)).status,
    413
  );
  assert.equal(
    (await worker.fetch(new Request('https://worker.test/admin'), env)).status,
    404
  );
  assert.equal(sqlite.prepare('SELECT count(*) n FROM jobs').get()!.n, 0);
});
test('database persistence failure is not acknowledged as success', async () => {
  const { db, sqlite } = database(),
    env = environment(db);
  sqlite.exec('DROP TABLE jobs');
  const body = JSON.stringify({
    event: 'invitee.created',
    payload: { uri: booking().uri },
  });
  assert.equal((await worker.fetch(request(body), env)).status, 503);
});
