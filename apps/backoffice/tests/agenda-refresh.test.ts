import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAgendaRefreshController,
  type AgendaRefreshActivity,
} from '../src/browser/agenda-refresh.ts';

function clock() {
  let time = 100_000;
  let sequence = 0;
  const timers = new Map<number, { callback: () => void; at: number }>();
  return {
    now: () => time,
    setTimer(callback: () => void, delay: number) {
      const id = ++sequence;
      timers.set(id, { callback, at: time + delay });
      return id;
    },
    clearTimer: (id: number) => void timers.delete(id),
    pending: () => timers.size,
    advance(milliseconds: number) {
      const target = time + milliseconds;
      for (;;) {
        const next = [...timers.entries()]
          .filter(([, timer]) => timer.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        time = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
      }
      time = target;
    },
  };
}

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

test('initial loading is not duplicated and the interval follows the last successful load', async () => {
  const timer = clock();
  const status = { loading: true, updatedAt: null as number | null };
  let calls = 0;
  const controller = createAgendaRefreshController({
    ...timer,
    getStatus: () => status,
    isVisible: () => true,
    refresh: async () => {
      calls++;
      status.updatedAt = timer.now();
      return true;
    },
  });
  assert.equal(calls, 0);
  timer.advance(10_000);
  status.loading = false;
  status.updatedAt = timer.now();
  controller.check();
  timer.advance(59_999);
  assert.equal(calls, 0);
  timer.advance(1);
  await settle();
  assert.equal(calls, 1);
  timer.advance(60_000);
  await settle();
  assert.equal(calls, 2);
  controller.stop();
  assert.equal(timer.pending(), 0);
});

test('a hidden tab has no polling timer and focus refreshes only stale data', async () => {
  const timer = clock();
  const status = { loading: false, updatedAt: timer.now() };
  let visible = true;
  let calls = 0;
  const controller = createAgendaRefreshController({
    ...timer,
    getStatus: () => status,
    isVisible: () => visible,
    refresh: async () => {
      calls++;
      status.updatedAt = timer.now();
      return true;
    },
  });
  timer.advance(10_000);
  visible = false;
  controller.check();
  assert.equal(timer.pending(), 0);
  timer.advance(10_000);
  visible = true;
  controller.check();
  controller.check();
  assert.equal(calls, 0);
  visible = false;
  controller.check();
  timer.advance(90_000);
  assert.equal(calls, 0);
  visible = true;
  controller.check();
  controller.check();
  await settle();
  assert.equal(calls, 1);
  controller.stop();
});

test('focus and remounts cannot duplicate an in-flight request, and unmount leaves no timer', async () => {
  const timer = clock();
  const status = { loading: false, updatedAt: timer.now() - 60_000 };
  const activity: AgendaRefreshActivity = {
    lastAttemptAt: status.updatedAt,
    pending: false,
  };
  let calls = 0;
  let finish!: (success: boolean) => void;
  const options = {
    ...timer,
    activity,
    getStatus: () => status,
    isVisible: () => true,
    refresh: () => {
      calls++;
      return new Promise<boolean>((resolve) => {
        finish = resolve;
      });
    },
  };
  const first = createAgendaRefreshController(options);
  assert.equal(calls, 1);
  first.check();
  first.stop();
  const second = createAgendaRefreshController(options);
  timer.advance(180_000);
  second.check();
  assert.equal(calls, 1);
  second.stop();
  status.updatedAt = timer.now();
  finish(true);
  await settle();
  assert.equal(timer.pending(), 0);
  timer.advance(180_000);
  assert.equal(calls, 1);
});

test('failed refreshes and initially failed loads wait before retrying despite repeated focus', async () => {
  const timer = clock();
  let calls = 0;
  const controller = createAgendaRefreshController({
    ...timer,
    getStatus: () => ({ loading: false, updatedAt: null }),
    isVisible: () => true,
    refresh: async () => {
      calls++;
      throw new Error('simulated network failure');
    },
  });
  controller.check();
  assert.equal(calls, 0);
  timer.advance(60_000);
  await settle();
  assert.equal(calls, 1);
  controller.check();
  controller.check();
  timer.advance(59_999);
  assert.equal(calls, 1);
  timer.advance(1);
  await settle();
  assert.equal(calls, 2);
  controller.stop();
});

test('an existing model refresh blocks polling without resetting the interval on every status check', async () => {
  const timer = clock();
  const status = { loading: false, updatedAt: timer.now() };
  let calls = 0;
  const controller = createAgendaRefreshController({
    ...timer,
    getStatus: () => status,
    isVisible: () => true,
    refresh: async () => {
      calls++;
      status.updatedAt = timer.now();
      return true;
    },
  });
  timer.advance(30_000);
  controller.check();
  timer.advance(29_000);
  status.loading = true;
  controller.check();
  timer.advance(20_000);
  assert.equal(calls, 0);
  status.loading = false;
  controller.check();
  await settle();
  assert.equal(calls, 1);
  controller.stop();
});
