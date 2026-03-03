import type { MovePayload, GameRecordSummary, GameRecordDetail } from '../../src/network/protocol.js';

const MAX_RECORDS = 200;
const records: GameRecordDetail[] = [];

export function saveRecord(record: GameRecordDetail): void {
  records.unshift(record);
  if (records.length > MAX_RECORDS) records.pop();
}

export function listRecords(): GameRecordSummary[] {
  return records.map(({ moves, ...summary }) => summary);
}

export function getRecord(id: string): GameRecordDetail | null {
  return records.find(r => r.id === id) ?? null;
}
