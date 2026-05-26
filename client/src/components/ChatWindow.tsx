import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/api";

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  renderAssistant?: (content: string, index: number) => React.ReactNode;
}

export function ChatWindow({ messages, loading, renderAssistant }: ChatWindowProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  return (
    <div className="h-[28rem] overflow-y-auto p-4 rounded-md border border-border bg-background space-y-3">
      {messages.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Tell me a bit about your background — where you studied, what you've done, where you are now.
        </p>
      )}
      {messages.map((m, i) => (
        <div
          key={i}
          className={
            "max-w-[85%] px-4 py-2 rounded-md text-sm " +
            (m.role === "user"
              ? "ml-auto bg-primary text-primary-foreground"
              : "mr-auto bg-muted text-foreground")
          }
        >
          {m.role === "assistant" && renderAssistant
            ? renderAssistant(m.content, i)
            : <span className="whitespace-pre-wrap">{m.content}</span>}
        </div>
      ))}
      {loading && (
        <div className="mr-auto max-w-[85%] px-4 py-2 rounded-md text-sm bg-muted text-muted-foreground italic">
          Thinking...
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
