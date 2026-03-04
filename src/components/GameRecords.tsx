import { useState, useEffect } from 'react';
import type { TypedSocket } from '../network/socket';
import type { GameRecordSummary, GameRecordDetail } from '../network/protocol';
import { getRecords, getRecordById, deleteRecord } from '../hooks/useLocalRecords';
import GameReplay from './GameReplay';

interface GameRecordsProps {
  socket?: TypedSocket | null;
  onBack: () => void;
}

export default function GameRecords({ socket, onBack }: GameRecordsProps) {
  const [onlineRecords, setOnlineRecords] = useState<GameRecordSummary[]>([]);
  const [localRecords, setLocalRecords] = useState<GameRecordSummary[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<GameRecordDetail | null>(null);
  const [onlineLoading, setOnlineLoading] = useState(!!socket);

  useEffect(() => {
    setLocalRecords(getRecords());
  }, []);

  useEffect(() => {
    if (socket) {
      socket.emit('records:list', (res) => {
        setOnlineRecords(res.records);
        setOnlineLoading(false);
      });
    }
  }, [socket]);

  const viewRecord = (id: string, isLocal: boolean) => {
    if (isLocal) {
      const detail = getRecordById(id);
      if (detail) setSelectedRecord(detail);
    } else if (socket) {
      socket.emit('records:detail', { id }, (detail) => {
        if (detail) setSelectedRecord(detail);
      });
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteRecord(id);
    setLocalRecords(getRecords());
  };

  if (selectedRecord) {
    return <GameReplay record={selectedRecord} onBack={() => setSelectedRecord(null)} />;
  }

  const resultText = (r: GameRecordSummary) => {
    if (r.result === 'red_win') return '红胜';
    if (r.result === 'black_win') return '黑胜';
    return '和棋';
  };

  const resultClass = (r: GameRecordSummary) => {
    if (r.result === 'red_win') return 'result-red';
    if (r.result === 'black_win') return 'result-black';
    return 'result-draw-text';
  };

  const renderList = (records: GameRecordSummary[], isLocal: boolean) => (
    <div className="records-list">
      {records.map((r) => (
        <div key={r.id} className="record-item" onClick={() => viewRecord(r.id, isLocal)}>
          <div className="record-players">
            <span className="record-red">{r.redPlayer}</span>
            <span className="record-vs">VS</span>
            <span className="record-black">{r.blackPlayer}</span>
          </div>
          <div className="record-info">
            <span className={resultClass(r)}>{resultText(r)}</span>
            <span className="record-moves">{r.moveCount} 步</span>
            <span className="record-date">{r.date}</span>
            {isLocal && (
              <button
                className="record-delete-btn"
                onClick={(e) => handleDelete(e, r.id)}
                title="删除"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="game-records">
      <h2>对局记录</h2>

      <h3 className="records-section-title">本地对战</h3>
      {localRecords.length === 0
        ? <p className="chat-empty">暂无本地对局记录</p>
        : renderList(localRecords, true)
      }

      <h3 className="records-section-title">在线对战</h3>
      {onlineLoading && <p className="waiting-text">加载中...</p>}
      {!onlineLoading && onlineRecords.length === 0 && (
        <p className="chat-empty">暂无在线对局记录</p>
      )}
      {!onlineLoading && onlineRecords.length > 0 && renderList(onlineRecords, false)}

      <button className="lobby-btn secondary" onClick={onBack}>返回</button>
    </div>
  );
}
