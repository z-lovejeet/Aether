"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  BookOpen,
  Target,
  RotateCcw,
  MessageCircle,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import {
  sendChatMessage,
  type ChatSourceDto,
} from "@/lib/agent-client";
import { LiquidGlassBadge } from "@/components/glass/LiquidGlassBadge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSourceDto[];
  suggestedAction?: string | null;
  timestamp: Date;
}

interface ChatDrawerProps {
  sessionId: string;
  materialId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToQuiz?: () => void;
}

const QUICK_PROMPTS = [
  "Explain this with an intuitive analogy",
  "What are common exam traps in this topic?",
  "Summarize the highest-yield points",
];

export default function ChatDrawer({
  sessionId,
  materialId,
  isOpen,
  onClose,
  onNavigateToQuiz,
}: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-greeting",
      role: "assistant",
      content:
        "Hello! I'm your Socratic Tutor. Ask me any question about your uploaded notes — I'll explain it grounded in your material and tailored to your learning style.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<ChatSourceDto | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await sendChatMessage(sessionId, materialId, text);
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answerMd,
        sources: response.sources,
        suggestedAction: response.suggestedAction,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "I encountered a connection issue while reviewing your notes. Please make sure the study material is uploaded and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setMessages([
      {
        id: `initial-${Date.now()}`,
        role: "assistant",
        content: "Chat cleared. What else would you like to explore in your notes?",
        timestamp: new Date(),
      },
    ]);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-50 flex h-full w-full max-w-md flex-col bg-white border-l border-slate-200/90 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow-xs">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-sm font-bold text-slate-900">
                      Aether Socratic Tutor
                    </h2>
                    <LiquidGlassBadge variant="emerald" size="sm">
                      Grounded RAG
                    </LiquidGlassBadge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Answers grounded in your uploaded notes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleClear}
                  title="Clear chat"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`flex gap-2 max-w-[88%] ${
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar Icon */}
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] ${
                        msg.role === "user"
                          ? "bg-slate-800 text-white"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}
                    >
                      {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`rounded-2xl px-4 py-3 text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                        msg.role === "user"
                          ? "bg-slate-900 text-white rounded-tr-xs"
                          : "bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs whitespace-pre-wrap"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>

                  {/* Sources Chips & Actions for Assistant */}
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="ml-8 mt-2 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                          Grounding Sources:
                        </span>
                        {msg.sources.map((s, idx) => (
                          <button
                            key={s.chunkId || idx}
                            onClick={() => setSelectedSource(selectedSource === s ? null : s)}
                            className="inline-flex items-center gap-1 rounded-md bg-indigo-50/80 border border-indigo-200/70 px-2 py-0.5 text-[11px] font-medium text-indigo-800 hover:bg-indigo-100 transition-colors"
                          >
                            <BookOpen className="h-3 w-3 text-indigo-600" />
                            <span>{s.sectionRef}</span>
                          </button>
                        ))}
                      </div>

                      {/* Source Excerpt Popover */}
                      {selectedSource && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-2.5 rounded-xl bg-indigo-50/90 border border-indigo-200 text-indigo-950 text-[11px] max-w-[320px] shadow-sm"
                        >
                          <div className="flex justify-between items-center font-semibold text-[10px] text-indigo-700 pb-1 border-b border-indigo-200/60">
                            <span>Excerpt from: {selectedSource.sectionRef}</span>
                            <span className="font-mono">Match {Math.round(selectedSource.similarity * 100)}%</span>
                          </div>
                          <p className="mt-1 text-slate-700 italic font-normal line-clamp-3">
                            &ldquo;{selectedSource.excerpt}&rdquo;
                          </p>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Suggested Action ("Quiz me on this") */}
                  {msg.role === "assistant" && msg.suggestedAction && onNavigateToQuiz && (
                    <div className="ml-8 mt-2">
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToQuiz();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-300/80 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-all shadow-xs"
                      >
                        <Target className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{msg.suggestedAction} →</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Indicator */}
              {loading && (
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px]">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl rounded-tl-xs bg-slate-50 border border-slate-200/80 px-4 py-3 text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                    <span className="ml-1 text-[11px] font-medium text-slate-400">Searching notes…</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips (when few messages) */}
            {messages.length <= 2 && (
              <div className="px-4 py-2 border-t border-slate-100 bg-white">
                <p className="text-[10px] text-slate-400 uppercase font-mono font-semibold mb-1.5">
                  Suggested Prompts:
                </p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="text-left text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      💬 {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="border-t border-slate-100 p-3.5 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask any question about your material…"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-400 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-all shrink-0 shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Press Enter to send</span>
                <span>Powered by Gemini + Groq</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
