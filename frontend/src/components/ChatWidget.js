import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { chat } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const employeeId = user?.employee_id;

  useEffect(() => {
    if (open && employeeId && !loaded) {
      chat.get(employeeId).then(r => {
        setMessages(r.data);
        setLoaded(true);
      }).catch(() => setLoaded(true));
    }
  }, [open, employeeId, loaded]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const handleSend = async () => {
    if (!input.trim() || !employeeId || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);

    setMessages(prev => [...prev, {
      message_id: `temp_${Date.now()}`, role: 'user', content: msg,
      created_at: new Date().toISOString()
    }]);

    try {
      const res = await chat.send(employeeId, msg);
      setMessages(prev => [...prev, res.data]);
    } catch {
      setMessages(prev => [...prev, {
        message_id: `err_${Date.now()}`, role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        created_at: new Date().toISOString(), sources: []
      }]);
    }
    setSending(false);
  };

  if (!employeeId) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-6 z-[60] w-[400px] max-w-[calc(100vw-48px)] rounded-xl overflow-hidden"
            style={{
              background: 'rgba(10, 15, 30, 0.95)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)'
            }}
            data-testid="chat-widget-panel"
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/20 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-[#2563EB]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Onboarding Assistant</p>
                  <p className="text-[10px] text-[#71717A]">Ask me anything about your onboarding</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-[#71717A] hover:text-white h-7 w-7 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="h-[360px] overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className="w-10 h-10 mx-auto text-[#2563EB]/30 mb-3" />
                  <p className="text-sm text-[#A1A1AA]">Hi! I'm your onboarding assistant.</p>
                  <p className="text-xs text-[#71717A] mt-1">Ask about policies, tools, or your onboarding plan.</p>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.message_id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 text-sm ${m.role === 'user' ? 'chat-bubble-user text-white' : 'chat-bubble-assistant text-[#E4E4E7]'}`}>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.sources?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                        {m.sources.map((s, i) => (
                          <div key={i} className="flex items-center gap-1 text-[10px] text-[#2563EB]">
                            <ExternalLink className="w-3 h-3" />
                            <span>{s.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="chat-bubble-assistant px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/[0.06]">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask a question..."
                  data-testid="chat-input"
                  className="flex-1 bg-[#111626] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  data-testid="chat-send-button"
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-9 w-9 p-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        data-testid="chat-widget-toggle"
        className="fixed bottom-6 right-6 z-[60] w-12 h-12 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-lg shadow-[#2563EB]/25 hover:bg-[#1D4ED8] transition-colors"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </motion.button>
    </>
  );
}
