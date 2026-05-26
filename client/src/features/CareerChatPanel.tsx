import { useState } from "react";
import { careerChat, type ChatMessage } from "@/lib/api";
import { ChatWindow } from "@/components/ChatWindow";

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

  return (
    <div className="space-y-4">
      <ChatWindow messages={messages} loading={loading} />

      <div className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type a message..."
          rows={2}
          className="flex-1 p-3 rounded-md border border-border bg-background text-sm resize-none"
        />
        <button
          onClick={onSend}
          disabled={loading || input.trim().length === 0}
          className="px-4 py-2 h-[3.25rem] rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-md border border-red-200 bg-red-50 text-red-900 text-sm">
          {error}
        </div>
      )}

      {messages.length > 0 && (
        <button onClick={reset} className="text-xs text-muted-foreground underline">
          Start over
        </button>
      )}
    </div>
  );
}
