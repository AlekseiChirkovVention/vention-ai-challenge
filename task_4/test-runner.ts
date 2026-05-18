#!/usr/bin/env ts-node
import { spawn } from 'child_process';
import * as readline from 'readline';
import * as path from 'path';

const SERVER_PATH = path.join(__dirname, 'dist', 'index.js');

const BASE_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  RUNWAY_COUNT: '2',
  RUNWAY_LENGTHS: '3000,2800',
  GATE_COUNT: '5',
  GROUND_CREW_COUNT: '8',
  DEPENDENCY_BUFFER_SEC: '300',
  ARRIVAL_DURATION_SEC: '1800',
  DEPARTURE_DURATION_SEC: '1800',
  SEPARATION_TAKEOFF_SEC: '60',
  SEPARATION_LANDING_SEC: '90',
  SEPARATION_MIXED_SEC: '120',
  GATE_TURNAROUND_SEC: '1800',
  MAX_HORIZON_SEC: '86400',
};

// ─── MCP Client ──────────────────────────────────────────────────────────────

interface RpcResponse {
  jsonrpc: '2.0';
  id?: number;
  result?: unknown;
  error?: { code: number; message: string };
}

class McpClient {
  private proc: ReturnType<typeof spawn>;
  private rl: readline.Interface;
  private msgId = 0;
  private pending = new Map<number, { res: (r: RpcResponse) => void; rej: (e: Error) => void }>();

  constructor(env: NodeJS.ProcessEnv = BASE_ENV) {
    this.proc = spawn('node', [SERVER_PATH], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    this.rl = readline.createInterface({ input: this.proc.stdout! });
    this.rl.on('line', (line) => {
      const text = line.trim();
      if (!text) return;
      let msg: RpcResponse;
      try { msg = JSON.parse(text); } catch { return; }
      if (msg.id != null) {
        const handler = this.pending.get(msg.id);
        if (handler) { this.pending.delete(msg.id); handler.res(msg); }
      }
    });
    this.proc.stderr?.on('data', () => {});
  }

  async initialize(): Promise<void> {
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-runner', version: '1.0.0' },
    });
    this.notify('notifications/initialized', {});
  }

  private notify(method: string, params: unknown): void {
    this.proc.stdin!.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  }

  request(method: string, params: unknown, timeoutMs = 10_000): Promise<RpcResponse> {
    const id = ++this.msgId;
    return new Promise((res, rej) => {
      const t = setTimeout(() => { this.pending.delete(id); rej(new Error(`Timeout: id=${id} method=${method}`)); }, timeoutMs);
      this.pending.set(id, { res: (r) => { clearTimeout(t); res(r); }, rej: (e) => { clearTimeout(t); rej(e); } });
      this.proc.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  async tool(name: string, args: Record<string, unknown> = {}): Promise<{ data: Record<string, unknown>; isError: boolean }> {
    const resp = await this.request('tools/call', { name, arguments: args });
    if (resp.error) throw new Error(`RPC error [${name}]: ${resp.error.message}`);
    const result = resp.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
    const text = result.content[0]?.text ?? '{}';
    return { data: JSON.parse(text) as Record<string, unknown>, isError: result.isError ?? false };
  }

  async resource(uri: string): Promise<Record<string, unknown>> {
    const resp = await this.request('resources/read', { uri });
    if (resp.error) throw new Error(`RPC error [${uri}]: ${resp.error.message}`);
    const result = resp.result as { contents: Array<{ uri: string; mimeType: string; text: string }> };
    return JSON.parse(result.contents[0]?.text ?? '{}') as Record<string, unknown>;
  }

  close(): Promise<void> {
    this.rl.close();
    this.proc.kill('SIGTERM');
    return new Promise((resolve) => { this.proc.on('exit', () => resolve()); setTimeout(resolve, 2000); });
  }
}

// ─── Assertion Helpers ────────────────────────────────────────────────────────

interface Assertion {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  context?: string;
}

interface ScenarioResult {
  num: number;
  name: string;
  assertions: Assertion[];
  error?: string;
}

function assert(
  list: Assertion[], name: string, condition: boolean,
  expected: string, actual: string, context?: string
): void {
  list.push({ name, passed: condition, expected, actual, context });
}

function dig(obj: unknown, dotPath: string): unknown {
  return dotPath.split('.').reduce((acc: unknown, k) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[k];
  }, obj);
}

function flightInSchedule(sched: Record<string, unknown>, fn: string): Record<string, unknown> | undefined {
  return (dig(sched, 'scheduledFlights') as Array<Record<string, unknown>> | undefined)?.find((f) => f['flightNumber'] === fn);
}

function flightInQueue(queue: Record<string, unknown>, fn: string): Record<string, unknown> | undefined {
  return (dig(queue, 'flights') as Array<Record<string, unknown>> | undefined)?.find((f) => f['flightNumber'] === fn);
}

// ─── Scenario 1 ──────────────────────────────────────────────────────────────

async function scenario1(): Promise<ScenarioResult> {
  const A: Assertion[] = [];
  const c = new McpClient();
  try {
    await c.initialize();
    await c.tool('submit_flight', { flightNumber: 'AA101', operationType: 'arrival', priority: 'high' });
    await c.tool('submit_flight', { flightNumber: 'UA200', operationType: 'departure', priority: 'medium' });
    await c.tool('submit_flight', { flightNumber: 'DL300', operationType: 'arrival', priority: 'low' });
    await c.tool('submit_flight', { flightNumber: 'SW400', operationType: 'departure', priority: 'low' });
    const sched = (await c.tool('generate_schedule')).data;
    const queue = await c.resource('atc://flights/queue');
    const timeline = await c.resource('atc://schedule/timeline');

    for (const fn of ['AA101', 'UA200', 'DL300', 'SW400']) {
      const f = flightInQueue(queue, fn);
      assert(A, `${fn} status=scheduled`, f?.['status'] === 'scheduled', 'scheduled', String(f?.['status']));
    }

    const aa101s = flightInSchedule(sched, 'AA101')?.['startTime'];
    const dl300s = flightInSchedule(sched, 'DL300')?.['startTime'];
    const ua200s = flightInSchedule(sched, 'UA200')?.['startTime'];
    const sw400s = flightInSchedule(sched, 'SW400')?.['startTime'];

    assert(A, 'AA101.startTime < DL300.startTime', (aa101s as number) < (dl300s as number), `<${dl300s}`, String(aa101s), 'priority ordering');
    assert(A, 'UA200.startTime < SW400.startTime', (ua200s as number) < (sw400s as number), `<${sw400s}`, String(ua200s), 'priority ordering');

    const ops = (dig(timeline, 'operations') as Array<Record<string, unknown>>) ?? [];
    const byRunway = new Map<string, Array<{ start: number; end: number; opType: string }>>();
    for (const op of ops) {
      const r = op['runwayId'] as string;
      if (!byRunway.has(r)) byRunway.set(r, []);
      byRunway.get(r)!.push({ start: op['startTime'] as number, end: op['endTime'] as number, opType: op['operationType'] as string });
    }
    let noOverlap = true;
    const overlapDetail: string[] = [];
    for (const [rId, slots] of byRunway) {
      slots.sort((a, b) => a.start - b.start);
      for (let i = 1; i < slots.length; i++) {
        const prev = slots[i - 1]!;
        const curr = slots[i]!;
        const sep = prev.opType === 'departure' && curr.opType === 'departure' ? 60
          : prev.opType === 'arrival' && curr.opType === 'arrival' ? 90 : 120;
        if (curr.start < prev.end + sep) {
          noOverlap = false;
          overlapDetail.push(`${rId}: end=${prev.end}+sep=${sep}=${prev.end + sep} > next.start=${curr.start}`);
        }
      }
    }
    assert(A, 'No runway overlap with separation', noOverlap, 'no overlap', overlapDetail.join('; ') || 'ok', 'runway separation');

    const summary = dig(queue, 'summary') as Record<string, number>;
    assert(A, 'summary.scheduled=4', summary?.['scheduled'] === 4, '4', String(summary?.['scheduled']));
    assert(A, 'summary.unscheduled=0', summary?.['unscheduled'] === 0, '0', String(summary?.['unscheduled']));
  } catch (err) {
    return { num: 1, name: 'Morning Rush', assertions: A, error: String(err) };
  } finally { await c.close(); }
  return { num: 1, name: 'Morning Rush', assertions: A };
}

// ─── Scenario 2 ──────────────────────────────────────────────────────────────

async function scenario2(): Promise<ScenarioResult> {
  const A: Assertion[] = [];
  const c = new McpClient();
  try {
    await c.initialize();
    await c.tool('submit_flight', { flightNumber: 'BIG001', operationType: 'departure', priority: 'high', requiredRunwayLength: 4000 });
    await c.tool('submit_flight', { flightNumber: 'AA101', operationType: 'arrival', priority: 'medium' });
    await c.tool('generate_schedule');
    const status = (await c.tool('get_status')).data;
    const queue = await c.resource('atc://flights/queue');

    const big = flightInQueue(queue, 'BIG001');
    assert(A, 'BIG001 status=unscheduled', big?.['status'] === 'unscheduled', 'unscheduled', String(big?.['status']));
    const reason = String(big?.['unscheduledReason'] ?? '').toLowerCase();
    assert(A, 'BIG001 reason mentions 4000 or runway', reason.includes('4000') || reason.includes('runway'), 'contains 4000/runway', reason);

    const aa = flightInQueue(queue, 'AA101');
    assert(A, 'AA101 status=scheduled', aa?.['status'] === 'scheduled', 'scheduled', String(aa?.['status']));
    assert(A, 'hasUnscheduledFlights=true', dig(status, 'resourceConstraints.hasUnscheduledFlights') === true, 'true', String(dig(status, 'resourceConstraints.hasUnscheduledFlights')));
    assert(A, 'byStatus.unscheduled=1', dig(status, 'flightCounts.byStatus.unscheduled') === 1, '1', String(dig(status, 'flightCounts.byStatus.unscheduled')));
    assert(A, 'byStatus.scheduled=1', dig(status, 'flightCounts.byStatus.scheduled') === 1, '1', String(dig(status, 'flightCounts.byStatus.scheduled')));
  } catch (err) {
    return { num: 2, name: 'Heavy Hauler', assertions: A, error: String(err) };
  } finally { await c.close(); }
  return { num: 2, name: 'Heavy Hauler', assertions: A };
}

// ─── Scenario 3 ──────────────────────────────────────────────────────────────

async function scenario3(): Promise<ScenarioResult> {
  const A: Assertion[] = [];
  const c = new McpClient();
  try {
    await c.initialize();
    await c.tool('submit_flight', { flightNumber: 'IN001', operationType: 'arrival', priority: 'high' });
    await c.tool('submit_flight', { flightNumber: 'OUT001', operationType: 'departure', priority: 'high', dependencies: ['IN001'] });
    const sched = (await c.tool('generate_schedule')).data;
    const timeline = await c.resource('atc://schedule/timeline');
    const bottleneck = (await c.tool('analyze_bottleneck')).data;

    const in001 = flightInSchedule(sched, 'IN001');
    const out001 = flightInSchedule(sched, 'OUT001');
    assert(A, 'IN001 status=scheduled', in001 != null, 'scheduled', in001 ? 'scheduled' : 'not in schedule');
    assert(A, 'OUT001 status=scheduled', out001 != null, 'scheduled', out001 ? 'scheduled' : 'not in schedule');

    const in001End = in001?.['endTime'] as number ?? 0;
    const out001Start = out001?.['startTime'] as number ?? 0;
    assert(A, 'OUT001.startTime >= IN001.endTime+300', out001Start >= in001End + 300, `>=${in001End + 300}`, String(out001Start), 'dependency buffer');
    assert(A, 'OUT001.startTime >= 2100', out001Start >= 2100, '>=2100', String(out001Start));

    assert(A, 'bottleneck exists=true', dig(bottleneck, 'exists') === true, 'true', String(dig(bottleneck, 'exists')));
    const chain = dig(bottleneck, 'chain') as string[] | undefined;
    assert(A, 'chain includes IN001', chain?.includes('IN001') ?? false, 'true', String(chain?.includes('IN001')));
    assert(A, 'chain includes OUT001', chain?.includes('OUT001') ?? false, 'true', String(chain?.includes('OUT001')));
    const in001Idx = chain?.indexOf('IN001') ?? -1;
    const out001Idx = chain?.indexOf('OUT001') ?? -1;
    assert(A, 'IN001 before OUT001 in chain', in001Idx < out001Idx, `IN001(${in001Idx}) < OUT001(${out001Idx})`, `${in001Idx} vs ${out001Idx}`);
    const totalDur = dig(bottleneck, 'totalDurationSeconds') as number ?? 0;
    assert(A, 'totalDurationSeconds >= 3600', totalDur >= 3600, '>=3600', String(totalDur));
  } catch (err) {
    return { num: 3, name: 'Connecting Flight', assertions: A, error: String(err) };
  } finally { await c.close(); }
  return { num: 3, name: 'Connecting Flight', assertions: A };
}

// ─── Scenario 4 ──────────────────────────────────────────────────────────────

async function scenario4(): Promise<ScenarioResult> {
  const A: Assertion[] = [];
  const c = new McpClient();
  try {
    await c.initialize();
    const r1 = (await c.tool('submit_flight', { flightNumber: 'F1', operationType: 'arrival', priority: 'high' })).data;
    assert(A, 'F1 submit success=true', r1['success'] === true, 'true', String(r1['success']), 'step 1');

    const r2 = (await c.tool('submit_flight', { flightNumber: 'F2', operationType: 'departure', priority: 'high', dependencies: ['F1'] })).data;
    assert(A, 'F2 submit success=true', r2['success'] === true, 'true', String(r2['success']), 'step 2');

    const r3 = (await c.tool('submit_flight', { flightNumber: 'F3', operationType: 'arrival', priority: 'low', dependencies: ['F3'] })).data;
    assert(A, 'F3 self-dep success=false', r3['success'] === false, 'false', String(r3['success']), 'step 3');
    const r3err = String(r3['error'] ?? '').toLowerCase();
    assert(A, 'F3 error mentions self/itself/cycle', r3err.includes('self') || r3err.includes('itself') || r3err.includes('cycle'), 'self/itself/cycle', r3err, 'step 3');

    const r4 = (await c.tool('submit_flight', { flightNumber: 'F1', operationType: 'departure', priority: 'medium' })).data;
    assert(A, 'F1 dup success=false', r4['success'] === false, 'false', String(r4['success']), 'step 4');
    const r4err = String(r4['error'] ?? '').toLowerCase();
    assert(A, 'F1 dup error mentions already exists/duplicate', r4err.includes('already') || r4err.includes('duplicate') || r4err.includes('exists'), 'already exists/duplicate', r4err, 'step 4');

    const r5 = (await c.tool('submit_flight', { flightNumber: 'F4', operationType: 'arrival', priority: 'low', dependencies: ['NONEXISTENT'] })).data;
    assert(A, 'F4 unknown dep success=false', r5['success'] === false, 'false', String(r5['success']), 'step 5');
    const r5err = String(r5['error'] ?? '').toLowerCase();
    assert(A, 'F4 error mentions NONEXISTENT/not found', r5err.includes('nonexistent') || r5err.includes('not found') || r5err.includes('does not exist'), 'NONEXISTENT/not found', r5err, 'step 5');

    const queue = await c.resource('atc://flights/queue');
    const total = dig(queue, 'totalFlights') as number;
    assert(A, 'total flights in queue = 2', total === 2, '2', String(total), 'only F1 and F2 accepted');
  } catch (err) {
    return { num: 4, name: 'Cycle Prevention', assertions: A, error: String(err) };
  } finally { await c.close(); }
  return { num: 4, name: 'Cycle Prevention', assertions: A };
}

// ─── Scenario 5 ──────────────────────────────────────────────────────────────

async function scenario5(): Promise<ScenarioResult> {
  const A: Assertion[] = [];
  const c = new McpClient();
  try {
    await c.initialize();
    await c.tool('submit_flight', { flightNumber: 'IN001', operationType: 'arrival', priority: 'high' });
    await c.tool('submit_flight', { flightNumber: 'OUT001', operationType: 'departure', priority: 'medium', dependencies: ['IN001'] });
    await c.tool('submit_flight', { flightNumber: 'OUT002', operationType: 'departure', priority: 'low', dependencies: ['IN001'] });
    await c.tool('generate_schedule');

    // Verify all 3 scheduled
    const queue1 = await c.resource('atc://flights/queue');
    for (const fn of ['IN001', 'OUT001', 'OUT002']) {
      const f = flightInQueue(queue1, fn);
      assert(A, `pre-cancel: ${fn} status=scheduled`, f?.['status'] === 'scheduled', 'scheduled', String(f?.['status']), 'after generate_schedule');
    }

    const cancelResult = (await c.tool('cancel_flight', { flightNumber: 'IN001' })).data;
    assert(A, 'cancel_flight success=true', cancelResult['success'] === true, 'true', String(cancelResult['success']));
    const affected = cancelResult['affectedFlights'] as string[] ?? [];
    assert(A, 'affectedFlights contains OUT001', affected.includes('OUT001'), 'true', String(affected));
    assert(A, 'affectedFlights contains OUT002', affected.includes('OUT002'), 'true', String(affected));

    const queue2 = await c.resource('atc://flights/queue');
    const in001 = flightInQueue(queue2, 'IN001');
    const out001 = flightInQueue(queue2, 'OUT001');
    const out002 = flightInQueue(queue2, 'OUT002');
    assert(A, 'IN001 status=cancelled', in001?.['status'] === 'cancelled', 'cancelled', String(in001?.['status']));
    assert(A, 'OUT001 status=pending', out001?.['status'] === 'pending', 'pending', String(out001?.['status']));
    assert(A, 'OUT002 status=pending', out002?.['status'] === 'pending', 'pending', String(out002?.['status']));
    assert(A, 'OUT001 NOT cancelled', out001?.['status'] !== 'cancelled', 'not cancelled', String(out001?.['status']));
    assert(A, 'OUT002 NOT cancelled', out002?.['status'] !== 'cancelled', 'not cancelled', String(out002?.['status']));
  } catch (err) {
    return { num: 5, name: 'Cancellation Cascade', assertions: A, error: String(err) };
  } finally { await c.close(); }
  return { num: 5, name: 'Cancellation Cascade', assertions: A };
}

// ─── Scenario 6 ──────────────────────────────────────────────────────────────

async function scenario6(): Promise<ScenarioResult> {
  const A: Assertion[] = [];
  const c = new McpClient();
  try {
    await c.initialize();
    await c.tool('submit_flight', { flightNumber: 'AA101', operationType: 'arrival', priority: 'high' });
    await c.tool('submit_flight', { flightNumber: 'UA200', operationType: 'departure', priority: 'medium', dependencies: ['AA101'] });
    await c.tool('submit_flight', { flightNumber: 'DL300', operationType: 'arrival', priority: 'low' });
    const r1 = (await c.tool('generate_schedule')).data;
    const r2 = (await c.tool('generate_schedule')).data;

    const sf1 = (r1['scheduledFlights'] as Array<Record<string, unknown>>) ?? [];
    const sf2 = (r2['scheduledFlights'] as Array<Record<string, unknown>>) ?? [];

    let identical = sf1.length === sf2.length;
    const diffs: string[] = [];
    if (identical) {
      for (const op1 of sf1) {
        const op2 = sf2.find((o) => o['flightNumber'] === op1['flightNumber']);
        if (!op2) { identical = false; diffs.push(`${op1['flightNumber']} missing in R2`); continue; }
        for (const k of ['startTime', 'endTime', 'runwayId', 'gateId']) {
          if (op1[k] !== op2[k]) { identical = false; diffs.push(`${op1['flightNumber']}.${k}: R1=${op1[k]} R2=${op2[k]}`); }
        }
      }
    }
    assert(A, 'scheduledFlights identical', identical, 'identical', diffs.join('; ') || 'ok', 'determinism');
    const ct1 = (r1['summary'] as Record<string, unknown>)?.['completionTimeSeconds'];
    const ct2 = (r2['summary'] as Record<string, unknown>)?.['completionTimeSeconds'];
    assert(A, 'completionTimeSeconds identical', !!(r1['summary'] && r2['summary'] && ct1 === ct2),
      'identical', `R1=${ct1} R2=${ct2}`);
  } catch (err) {
    return { num: 6, name: 'Determinism', assertions: A, error: String(err) };
  } finally { await c.close(); }
  return { num: 6, name: 'Determinism', assertions: A };
}

// ─── Scenario 7 ──────────────────────────────────────────────────────────────

async function scenario7(): Promise<ScenarioResult> {
  const A: Assertion[] = [];
  const c = new McpClient();
  try {
    await c.initialize();
    const sched = (await c.tool('generate_schedule')).data;
    assert(A, 'generate_schedule no error', sched['success'] === true, 'true', String(sched['success']));
    assert(A, 'scheduledCount=0', (sched['summary'] as Record<string, unknown>)?.['scheduledCount'] === 0, '0', String((sched['summary'] as Record<string, unknown>)?.['scheduledCount']));

    const status = (await c.tool('get_status')).data;
    assert(A, 'total flights=0', dig(status, 'flightCounts.total') === 0, '0', String(dig(status, 'flightCounts.total')));

    const queue = await c.resource('atc://flights/queue');
    const flights = dig(queue, 'flights') as unknown[];
    assert(A, 'queue flights=[]', Array.isArray(flights) && flights.length === 0, '[]', JSON.stringify(flights));

    const timeline = await c.resource('atc://schedule/timeline');
    const ops = dig(timeline, 'operations') as unknown[];
    assert(A, 'timeline operations=[]', Array.isArray(ops) && ops.length === 0, '[]', JSON.stringify(ops));

    const bn = (await c.tool('analyze_bottleneck')).data;
    assert(A, 'bottleneck exists=false', bn['exists'] === false, 'false', String(bn['exists']));
  } catch (err) {
    return { num: 7, name: 'Empty Airport', assertions: A, error: String(err) };
  } finally { await c.close(); }
  return { num: 7, name: 'Empty Airport', assertions: A };
}

// ─── Scenario 8 ──────────────────────────────────────────────────────────────

async function scenario8(): Promise<ScenarioResult> {
  const A: Assertion[] = [];
  const c = new McpClient();
  try {
    await c.initialize();
    await c.tool('submit_flight', { flightNumber: 'AA101', operationType: 'arrival', priority: 'high' });
    await c.tool('submit_flight', { flightNumber: 'UA200', operationType: 'departure', priority: 'medium' });
    await c.tool('generate_schedule');
    await c.tool('cancel_flight', { flightNumber: 'AA101' });
    await c.tool('cancel_flight', { flightNumber: 'UA200' });
    const sched2 = (await c.tool('generate_schedule')).data;
    const status = (await c.tool('get_status')).data;

    assert(A, 'scheduledCount=0 after re-schedule', (sched2['summary'] as Record<string, unknown>)?.['scheduledCount'] === 0, '0', String((sched2['summary'] as Record<string, unknown>)?.['scheduledCount']));
    assert(A, 'byStatus.cancelled=2', dig(status, 'flightCounts.byStatus.cancelled') === 2, '2', String(dig(status, 'flightCounts.byStatus.cancelled')));
    assert(A, 'byStatus.scheduled=0', dig(status, 'flightCounts.byStatus.scheduled') === 0, '0', String(dig(status, 'flightCounts.byStatus.scheduled')));
    assert(A, 'server did not crash', true, 'true', 'true');
  } catch (err) {
    return { num: 8, name: 'All Cancelled', assertions: A, error: String(err) };
  } finally { await c.close(); }
  return { num: 8, name: 'All Cancelled', assertions: A };
}

// ─── Scenario 9 ──────────────────────────────────────────────────────────────

async function scenario9(): Promise<ScenarioResult> {
  const A: Assertion[] = [];
  const env = { ...BASE_ENV, GROUND_CREW_COUNT: '1' };
  const c = new McpClient(env);
  try {
    await c.initialize();
    await c.tool('submit_flight', { flightNumber: 'AA101', operationType: 'arrival', priority: 'high' });
    await c.tool('submit_flight', { flightNumber: 'UA200', operationType: 'arrival', priority: 'high' });
    await c.tool('submit_flight', { flightNumber: 'DL300', operationType: 'arrival', priority: 'high' });
    const sched = (await c.tool('generate_schedule')).data;
    const timeline = await c.resource('atc://schedule/timeline');

    const sf = (sched['scheduledFlights'] as Array<Record<string, unknown>>) ?? [];
    assert(A, 'all 3 scheduled', sf.length === 3, '3', String(sf.length));

    const aa101 = flightInSchedule(sched, 'AA101');
    const ua200 = flightInSchedule(sched, 'UA200');
    const dl300 = flightInSchedule(sched, 'DL300');

    const aa101End = aa101?.['endTime'] as number ?? 0;
    const ua200Start = ua200?.['startTime'] as number ?? 0;
    const ua200End = ua200?.['endTime'] as number ?? 0;
    const dl300Start = dl300?.['startTime'] as number ?? 0;

    assert(A, 'AA101.endTime <= UA200.startTime', aa101End <= ua200Start, `<=${ua200Start}`, String(aa101End), 'crew serialization');
    assert(A, 'UA200.endTime <= DL300.startTime', ua200End <= dl300Start, `<=${dl300Start}`, String(ua200End), 'crew serialization');

    // Verify no overlaps
    const ops = (dig(timeline, 'operations') as Array<Record<string, unknown>>) ?? [];
    let noOverlap = true;
    for (let i = 0; i < ops.length; i++) {
      for (let j = i + 1; j < ops.length; j++) {
        const a = ops[i]!;
        const b = ops[j]!;
        const aStart = a['startTime'] as number;
        const aEnd = a['endTime'] as number;
        const bStart = b['startTime'] as number;
        const bEnd = b['endTime'] as number;
        if (aStart < bEnd && bStart < aEnd) { noOverlap = false; }
      }
    }
    assert(A, 'no ops overlap in time', noOverlap, 'no overlap', noOverlap ? 'ok' : 'overlap detected', 'crew=1');
  } catch (err) {
    return { num: 9, name: 'Ground Crew Constraint', assertions: A, error: String(err) };
  } finally { await c.close(); }
  return { num: 9, name: 'Ground Crew Constraint', assertions: A };
}

// ─── Scenario 10 ─────────────────────────────────────────────────────────────

function spawnBadConfig(env: NodeJS.ProcessEnv): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn('node', [SERVER_PATH], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stderrData = '';
    proc.stderr?.on('data', (d: Buffer) => { stderrData += d.toString(); });
    proc.stdout?.on('data', () => {});
    proc.on('exit', (code) => resolve({ code: code ?? -1, stderr: stderrData }));
    setTimeout(() => { proc.kill(); resolve({ code: -1, stderr: stderrData }); }, 5000);
  });
}

async function scenario10(): Promise<ScenarioResult> {
  const A: Assertion[] = [];
  try {
    const badConfigs: Array<{ label: string; env: NodeJS.ProcessEnv }> = [
      { label: 'RUNWAY_COUNT=0', env: { ...BASE_ENV, RUNWAY_COUNT: '0' } },
      { label: 'RUNWAY_COUNT=abc', env: { ...BASE_ENV, RUNWAY_COUNT: 'abc' } },
      { label: 'count=2 but 1 length', env: { ...BASE_ENV, RUNWAY_COUNT: '2', RUNWAY_LENGTHS: '3000' } },
      { label: 'GATE_COUNT=-1', env: { ...BASE_ENV, GATE_COUNT: '-1' } },
      {
        label: 'no env vars', env: {
          PATH: process.env['PATH'] ?? '',
          HOME: process.env['HOME'] ?? '',
        }
      },
    ];

    for (const cfg of badConfigs) {
      const { code, stderr } = await spawnBadConfig(cfg.env);
      assert(A, `${cfg.label}: exit code=1`, code === 1, '1', String(code), `bad config: ${cfg.label}`);
      assert(A, `${cfg.label}: stderr non-empty`, stderr.trim().length > 0, 'non-empty', stderr.length === 0 ? '(empty)' : 'non-empty', `bad config: ${cfg.label}`);
      const stderrLower = stderr.toLowerCase();
      const hasDesc = stderrLower.includes('invalid') || stderrLower.includes('required') || stderrLower.includes('must be') || stderrLower.includes('error') || stderrLower.includes('config');
      assert(A, `${cfg.label}: stderr descriptive`, hasDesc, 'descriptive', stderr.slice(0, 100), `bad config: ${cfg.label}`);
    }
  } catch (err) {
    return { num: 10, name: 'Invalid Config', assertions: A, error: String(err) };
  }
  return { num: 10, name: 'Invalid Config', assertions: A };
}

// ─── Scenario 11 ─────────────────────────────────────────────────────────────

async function scenario11(): Promise<ScenarioResult> {
  const A: Assertion[] = [];
  const c = new McpClient();
  try {
    await c.initialize();
    await c.tool('submit_flight', { flightNumber: 'AA101', operationType: 'arrival', priority: 'high' });
    await c.tool('submit_flight', { flightNumber: 'UA200', operationType: 'departure', priority: 'medium' });
    await c.tool('generate_schedule');
    const rwy = await c.resource('atc://runways/availability');

    const totalRunways = rwy['totalRunways'] as number;
    assert(A, 'totalRunways=2', totalRunways === 2, '2', String(totalRunways));

    const runways = rwy['runways'] as Array<Record<string, unknown>> ?? [];
    assert(A, 'runways array length=2', runways.length === 2, '2', String(runways.length));

    for (const r of runways) {
      const hasId = 'id' in r;
      const hasLen = 'lengthMeters' in r;
      const hasOps = 'operationsScheduled' in r;
      assert(A, `runway ${r['id']} has id/lengthMeters/operationsScheduled`, hasId && hasLen && hasOps, 'true', `id=${hasId} len=${hasLen} ops=${hasOps}`);
    }

    const totalOps = runways.reduce((sum, r) => sum + (r['operationsScheduled'] as number ?? 0), 0);
    assert(A, 'sum operationsScheduled=2', totalOps === 2, '2', String(totalOps));

    // busyPeriods non-overlapping per runway
    let busyOk = true;
    for (const r of runways) {
      const periods = (r['busyPeriods'] as Array<{ from: number; to: number }>) ?? [];
      for (let i = 1; i < periods.length; i++) {
        if (periods[i]!.from < periods[i - 1]!.to) { busyOk = false; }
      }
    }
    assert(A, 'busyPeriods non-overlapping per runway', busyOk, 'true', String(busyOk));
  } catch (err) {
    return { num: 11, name: 'Runway Resource', assertions: A, error: String(err) };
  } finally { await c.close(); }
  return { num: 11, name: 'Runway Resource', assertions: A };
}

// ─── Scenario 12 ─────────────────────────────────────────────────────────────

async function scenario12(): Promise<ScenarioResult> {
  const A: Assertion[] = [];
  const c = new McpClient();
  try {
    await c.initialize();
    await c.tool('submit_flight', { flightNumber: 'IN001', operationType: 'arrival', priority: 'high' });
    await c.tool('submit_flight', { flightNumber: 'OUT001', operationType: 'departure', priority: 'medium', dependencies: ['IN001'] });
    await c.tool('cancel_flight', { flightNumber: 'IN001' });
    await c.tool('generate_schedule');
    const queue = await c.resource('atc://flights/queue');

    const in001 = flightInQueue(queue, 'IN001');
    const out001 = flightInQueue(queue, 'OUT001');
    assert(A, 'IN001 status=cancelled', in001?.['status'] === 'cancelled', 'cancelled', String(in001?.['status']));
    assert(A, 'OUT001 status=scheduled', out001?.['status'] === 'scheduled', 'scheduled', String(out001?.['status']), 'cancelled dep does not block');

    const sched = (await c.tool('generate_schedule')).data;
    const out001s = flightInSchedule(sched, 'OUT001');
    const startTime = out001s?.['startTime'] as number ?? -1;
    assert(A, 'OUT001.startTime >= 0', startTime >= 0, '>=0', String(startTime));
  } catch (err) {
    return { num: 12, name: 'Cancelled Dependency', assertions: A, error: String(err) };
  } finally { await c.close(); }
  return { num: 12, name: 'Cancelled Dependency', assertions: A };
}

// ─── Runner & Reporter ────────────────────────────────────────────────────────

function pad(s: string, n: number): string { return s.padEnd(n); }

async function main(): Promise<void> {
  console.log('Running MCP server validation...\n');

  const results: ScenarioResult[] = await Promise.all([
    scenario1(), scenario2(), scenario3(), scenario4(),
    scenario5(), scenario6(), scenario7(), scenario8(),
    scenario9(), scenario10(), scenario11(), scenario12(),
  ]);

  // Sort by scenario number
  results.sort((a, b) => a.num - b.num);

  const failures: Array<{ scenarioNum: number; scenarioName: string; assertion: Assertion }> = [];

  console.log('─'.repeat(70));
  for (const r of results) {
    const passed = r.assertions.filter((a) => a.passed).length;
    const total = r.assertions.length;
    const allPass = passed === total && !r.error;
    const status = allPass ? 'PASS' : 'FAIL';
    const label = `SCENARIO ${r.num.toString().padStart(2)} - ${r.name}`;
    console.log(`${pad(label, 40)} [${status}] ${passed}/${total} assertions passed`);
    if (r.error) console.log(`  ERROR: ${r.error}`);
    for (const a of r.assertions) {
      if (!a.passed) failures.push({ scenarioNum: r.num, scenarioName: r.name, assertion: a });
    }
  }

  const totalAssertions = results.reduce((s, r) => s + r.assertions.length, 0);
  const totalPassed = results.reduce((s, r) => s + r.assertions.filter((a) => a.passed).length, 0);
  const failedScenarios = results.filter((r) => r.assertions.some((a) => !a.passed) || r.error).length;

  console.log('─'.repeat(70));
  console.log(`\nTOTAL: ${totalPassed}/${totalAssertions} assertions passed. ${failedScenarios} scenarios failed.\n`);

  if (failures.length > 0) {
    console.log('─── FAILURES ─────────────────────────────────────────────────────────\n');
    for (const { scenarioNum, scenarioName, assertion: a } of failures) {
      console.log(`[SCENARIO ${scenarioNum} - ${scenarioName}] ASSERTION FAILED: ${a.name}`);
      console.log(`  Expected: ${a.expected}`);
      console.log(`  Actual:   ${a.actual}`);
      if (a.context) console.log(`  Context:  ${a.context}`);
      console.log();
    }
  } else {
    console.log('ALL SCENARIOS PASSED. Server is production-ready.');
  }

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => { console.error('Test runner error:', err); process.exit(2); });
