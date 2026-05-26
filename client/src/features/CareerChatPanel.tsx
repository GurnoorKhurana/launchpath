import { useMemo, useState } from "react";
import { careerChat, type ChatMessage } from "@/lib/api";
import { ChatWindow } from "@/components/ChatWindow";
import { parseAssistantMessage } from "@/lib/roadmap";
import { RoadmapCard } from "@/components/RoadmapCard";
import { Markdown } from "@/lib/markdown";

export default function CareerChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSend() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const out = await careerChat(next);
      setMessages([...next, { role: "assistant", content: out.assistantMessage }]);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      // Roll back so the user can retry without re-typing.
      setMessages(messages);
      setInput(text);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  function reset() {
    setMessages([]);
    setInput("");
    setError(null);
  }

  const latestRoadmap = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      const { roadmap } = parseAssistantMessage(m.content);
      if (roadmap) return roadmap;
    }
    return null;
  }, [messages]);

  function onPrint() {
    window.print();
  }

  return (
    <div className="space-y-4">
      {latestRoadmap && (
        <section
          data-print="roadmap"
          className="border border-hairline bg-surface rounded-lg p-5"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-baseline gap-3">
              <h2 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                Your career roadmap
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                Updated from chat
              </span>
            </div>
            <button
              onClick={onPrint}
              data-print-hide="true"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-bg text-ink font-sans font-medium text-[13px] rounded-lg border border-hairline tracking-[-0.005em] hover:border-accent hover:text-accent"
            >
              <span className="font-mono text-[11px]">↓</span> Download as PDF
            </button>
          </div>
          <RoadmapCard roadmap={latestRoadmap} />
          <p className="mt-4 text-[11px] text-muted-foreground italic">
            Tip: choose <span className="font-mono">Save as PDF</span> in the print dialog to keep this roadmap.
          </p>
        </section>
      )}

      <ChatWindow
        messages={messages}
        loading={loading}
        renderAssistant={(content) => {
          const { prose } = parseAssistantMessage(content);
          return <Markdown text={prose} />;
        }}
      />

      <div className="border border-hairline bg-surface rounded-lg p-3.5 flex gap-3 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type a message..."
          rows={2}
          className="flex-1 border border-hairline rounded-lg px-3.5 py-3 font-sans text-sm text-ink bg-bg resize-none min-h-[56px] outline-none leading-[1.5] tracking-[-0.003em] placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={onSend}
          disabled={loading || input.trim().length === 0}
          className="inline-flex items-center gap-1.5 h-11 px-[18px] bg-accent text-white font-sans font-semibold text-sm rounded-lg tracking-[-0.005em] shadow-[0_1px_0_rgba(10,10,10,0.04),inset_0_-1px_0_rgba(0,0,0,0.08)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send <span className="font-mono font-medium">→</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-md border border-red-200 bg-red-50 text-red-900 text-sm">
          {error}
        </div>
      )}

      {messages.length > 0 && (
        <button
          onClick={reset}
          className="text-xs text-muted-foreground hover:text-body border-b border-dashed border-[#D4D4D4] pb-px"
        >
          Start over
        </button>
      )}
    </div>
  );
}
