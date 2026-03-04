import type { GameRecordDetail, GameRecordSummary, MovePayload } from '../network/protocol';

const STORAGE_KEY = 'chess_local_records';
const MAX_RECORDS = 50;

export type LocalGameRecord = GameRecordDetail;

function readAll(): LocalGameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(records: LocalGameRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function saveRecord(record: LocalGameRecord) {
  const records = readAll();
  records.unshift(record);
  if (records.length > MAX_RECORDS) {
    records.length = MAX_RECORDS;
  }
  writeAll(records);
}

export function getRecords(): GameRecordSummary[] {
  return readAll().map(({ moves, ...summary }) => summary);
}

export function getRecordById(id: string): GameRecordDetail | null {
  return readAll().find(r => r.id === id) ?? null;
}

export function deleteRecord(id: string) {
  writeAll(readAll().filter(r => r.id !== id));
}
