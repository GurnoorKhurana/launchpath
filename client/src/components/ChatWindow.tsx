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
    <div className="min-h-[20rem] max-h-[28rem] overflow-y-auto border border-hairline rounded-lg bg-surface p-5 flex flex-col gap-3.5">
      {messages.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Tell me a bit about your background — where you studied, what you've done, where you are now.
        </p>
      )}
      {messages.map((m, i) => {
        const isUser = m.role === "user";
        return (
          <div
            key={i}
            className={
              "flex max-w-[78%] " +
              (isUser ? "self-end justify-end" : "self-start")
            }
          >
            <div
              className={
                "px-3.5 py-3 text-sm leading-[1.55] tracking-[-0.003em] " +
                (isUser
                  ? "bg-accent text-white rounded-[6px_6px_2px_6px]"
                  : "bg-[#F5F5F5] text-ink rounded-[6px_6px_6px_2px]")
              }
            >
              {m.role === "assistant" && renderAssistant ? (
                renderAssistant(m.content, i)
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
            </div>
          </div>
        );
      })}
      {loading && (
        <div className="flex self-start max-w-[78%]">
          <div className="px-3.5 py-3 text-sm bg-[#F5F5F5] text-muted-foreground italic rounded-[6px_6px_6px_2px]">
            Thinking...
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
