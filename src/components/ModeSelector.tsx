interface ModeSelectorProps {
  onSelectOffline: () => void;
  onSelectOnline: () => void;
  onSelectRecords?: () => void;
}

export default function ModeSelector({ onSelectOffline, onSelectOnline, onSelectRecords }: ModeSelectorProps) {
  return (
    <div className="mode-selector">
      <h1 className="title">中国象棋</h1>
      <div className="mode-buttons">
        <button className="mode-btn" onClick={onSelectOffline}>单机对战</button>
        <button className="mode-btn" onClick={onSelectOnline}>在线对战</button>
        {onSelectRecords && <button className="mode-btn" onClick={onSelectRecords}>对局记录</button>}
      </div>
    </div>
  );
}
