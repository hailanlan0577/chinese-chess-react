import { useState, useEffect } from 'react';
import type { TypedSocket } from '../network/socket';
import type { GameRecordSummary, GameRecordDetail } from '../network/protocol';
import GameReplay from './GameReplay';

interface GameRecordsProps {
  socket: TypedSocket;
  onBack: () => void;
}

export default function GameRecords({ socket, onBack }: GameRecordsProps) {
  const [records, setRecords] = useState<GameRecordSummary[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<GameRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    socket.emit('records:list', (res) => {
      setRecords(res.records);
      setLoading(false);
    });
  }, [socket]);

  const viewRecord = (id: string) => {
    socket.emit('records:detail', { id }, (detail) => {
      if (detail) setSelectedRecord(detail);
    });
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

  return (
    <div className="game-records">
      <h2>对局记录</h2>
      {loading && <p className="waiting-text">加载中...</p>}
      {!loading && records.length === 0 && (
        <p className="chat-empty">暂无对局记录</p>
      )}
      {!loading && records.length > 0 && (
        <div className="records-list">
          {records.map((r) => (
            <div key={r.id} className="record-item" onClick={() => viewRecord(r.id)}>
              <div className="record-players">
                <span className="record-red">{r.redPlayer}</span>
                <span className="record-vs">VS</span>
                <span className="record-black">{r.blackPlayer}</span>
              </div>
              <div className="record-info">
                <span className={resultClass(r)}>{resultText(r)}</span>
                <span className="record-moves">{r.moveCount} 步</span>
                <span className="record-date">{r.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <button className="lobby-btn secondary" onClick={onBack}>返回</button>
    </div>
  );
}
