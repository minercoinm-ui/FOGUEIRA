import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/game';
import { Send, MessageSquare, Sparkles } from 'lucide-react';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const PRESET_PHRASES = [
  'Boa noite a todos!',
  'O fogo tá quentinho hoje!',
  'Que paz nesta fazenda...',
  'Vou me sentar um pouco no tronco.',
  'Adorei as estrelas no céu!',
];

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  onSendMessage,
  isOpen,
  onToggle,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handlePresetClick = (phrase: string) => {
    onSendMessage(phrase);
  };

  return (
    <div className="pointer-events-auto flex flex-col items-start">
      {/* Toggle Button when closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-stone-900/90 border border-amber-500/30 text-amber-200 hover:text-amber-100 hover:border-amber-400 text-xs font-semibold shadow-lg transition-all cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span>Chat da Fogueira</span>
          {messages.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 ml-1"></span>
          )}
        </button>
      )}

      {/* Main Chat Box Panel */}
      {isOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-stone-950/95 border border-amber-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200 text-xs backdrop-blur-md">
          {/* Header */}
          <div className="px-4 py-2.5 bg-stone-900/80 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-amber-200 font-cinzel tracking-wider text-sm">
                Chat da Fogueira
              </span>
            </div>
            <button
              onClick={onToggle}
              className="text-stone-400 hover:text-stone-100 text-xs px-2.5 py-1 rounded bg-stone-800/60 hover:bg-stone-800 cursor-pointer"
            >
              ✕ Fechar
            </button>
          </div>

          {/* Quick Preset Phrases */}
          <div className="px-3 py-2 bg-stone-900/40 border-b border-stone-800/60 flex items-center space-x-1.5 overflow-x-auto scrollbar-none touch-pan-x">
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0 mr-1" />
            {PRESET_PHRASES.map((phrase) => (
              <button
                key={phrase}
                onClick={() => handlePresetClick(phrase)}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-stone-800/80 hover:bg-amber-500/20 hover:text-amber-200 border border-stone-700/60 transition-colors cursor-pointer text-stone-300 active:scale-95"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Message Feed */}
          <div className="p-3 h-40 sm:h-48 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-stone-800">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-stone-500 text-center text-xs">
                Aproxime-se da fogueira e diga um olá!
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded-xl ${
                  msg.isSystem
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]'
                    : 'bg-stone-900/70 border border-stone-800/80'
                }`}
              >
                {!msg.isSystem && (
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-amber-400 text-xs">
                      {msg.sender}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className="text-stone-200 break-words leading-relaxed">
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Text Input */}
          <form onSubmit={handleSubmit} className="p-2.5 bg-stone-900/90 border-t border-stone-800 flex items-center space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite uma mensagem..."
              maxLength={120}
              className="flex-1 px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-700/80 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400 text-xs"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
