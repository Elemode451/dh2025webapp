"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import type { PlantChatMessage } from "@/lib/gemini";

type Plant = {
  id: string;
  plantName: string;
  emoji: string;
  species: {
    scientificName: string;
    name: string;
  };
};

type PlantModalProps = {
  plant: Plant;
  onClose: () => void;
};

type Message = PlantChatMessage;

export function PlantModal({ plant, onClose }: PlantModalProps) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      role: "assistant",
      content: `Hi there! I'm ${plant.plantName} ${plant.emoji} and I'm feeling leafy and bright today. How's your world outside the pot?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const subtitle = useMemo(() => {
    return `${plant.species.name} • ${plant.species.scientificName}`;
  }, [plant.species.name, plant.species.scientificName]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();

    if (!trimmed) {
      return;
    }

    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];

    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/plant-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plantName: plant.plantName,
          emoji: plant.emoji,
          messages: nextMessages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reach plant chat");
      }

      const data = (await response.json()) as { message?: Message };

      if (!data.message) {
        throw new Error("No message returned");
      }

      setMessages((current) => [...current, data.message]);
    } catch (err) {
      console.error(err);
      setError("Your plant got a little shy. Try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div aria-hidden={true} className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[var(--panel)]/95 text-[var(--ink)] shadow-2xl backdrop-blur">
        <header className="flex items-start justify-between gap-6 border-b border-white/10 bg-black/5 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--muted)]">Chat with your plant</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">{plant.plantName}</h2>
            <p className="text-sm text-[var(--muted)]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/40 text-sm font-semibold text-[var(--ink)] transition-colors duration-200 hover:bg-white"
          >
            ✕
          </button>
        </header>

        <div className="flex flex-col gap-6 px-6 py-6">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)]/20 via-white/40 to-white/10 text-5xl">
            {plant.emoji}
          </div>
          <p className="text-center text-sm text-[var(--muted)]">
            This happy plant loves hearing about your day. Share your thoughts and it will respond with leafy cheer.
          </p>

          <div className="flex max-h-[320px] flex-col gap-3 overflow-y-auto rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-[var(--ink)] shadow-inner">
            {messages.map((message, index) => {
              const isAssistant = message.role === "assistant";

              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm transition-colors ${
                      isAssistant
                        ? "bg-gradient-to-br from-[var(--accent)]/15 via-white to-white text-[var(--ink)]"
                        : "bg-black/80 text-white"
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-black/10 bg-black/5 px-5 py-4">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Tell your plant something lovely..."
              className="flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Growing..." : "Send"}
            </button>
          </div>
          {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}
