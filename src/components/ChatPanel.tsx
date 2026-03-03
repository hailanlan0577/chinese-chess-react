import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../network/protocol';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
}

export default function ChatPanel({ messages, onSend }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel">
      <button
        className="chat-toggle"
        onClick={() => setOpen(!open)}
      >
        {open ? '收起聊天' : `聊天 (${messages.length})`}
      </button>

      {open && (
        <>
          <div className="chat-messages">
            {messages.length === 0 && (
              <span className="chat-empty">暂无消息</span>
            )}
            {messages.map((msg, i) => (
              <div key={i} className="chat-message">
                <span className="chat-sender">{msg.sender}</span>: {msg.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息..."
              maxLength={200}
            />
            <button onClick={handleSend} disabled={!input.trim()}>
              发送
            </button>
          </div>
        </>
      )}
    </div>
  );
}
