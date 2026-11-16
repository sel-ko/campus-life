// Phone notifications that drop in from the top: bank credit and debit
// alerts, and messages from Mum and Dad. Each shows once, for a few seconds;
// tapping one opens the chats.
import { useEffect, useRef, useState } from 'react';
import { getPerson } from '../content/people';
import type { GameState } from '../game/types';
import { useGameStore } from '../store/gameStore';

const WATCHED = ['bank', 'family'];

interface Note {
  id: number;
  thread: string;
  title: string;
  text: string;
}

export function Notifications({ game }: { game: GameState }) {
  const openPhone = useGameStore((s) => s.openPhone);
  const shown = useRef(new Set<number>());
  const [queue, setQueue] = useState<Note[]>([]);

  // New unread messages in the watched threads join the queue.
  useEffect(() => {
    const fresh: Note[] = [];
    for (const id of WATCHED) {
      const t = game.chat.threads[id];
      if (!t || !t.unread) continue;
      for (const m of t.messages.slice(-t.unread)) {
        if (shown.current.has(m.id) || m.from === 'me') continue;
        shown.current.add(m.id);
        fresh.push({
          id: m.id,
          thread: id,
          title: id === 'bank' ? (m.text.startsWith('Debit') ? '🏦 Debit alert' : '🏦 Credit alert') : `💬 ${getPerson(m.from)?.name ?? 'Family'}`,
          text: m.text,
        });
      }
    }
    if (fresh.length) setQueue((q) => [...q, ...fresh]);
  }, [game.chat]);

  const note = queue[0];
  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setQueue((q) => q.slice(1)), 5500);
    return () => window.clearTimeout(id);
  }, [note]);

  if (!note) return null;
  const amount = note.thread === 'bank' ? note.text.match(/Amt: ([^·]+)/)?.[1]?.trim() : undefined;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[45] flex justify-center px-3 pt-[max(0.6rem,env(safe-area-inset-top))]">
      <button
        key={note.id}
        onClick={() => {
          setQueue((q) => q.slice(1));
          openPhone('chat');
        }}
        className="note-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-3xl border border-white/15 bg-[#1B2733]/95 p-3 text-left shadow-2xl backdrop-blur"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-xl" aria-hidden="true">
          {note.thread === 'bank' ? '🏦' : '💬'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold">{note.title}</span>
            {amount && <span className={`text-sm font-black ${note.title.includes('Debit') ? 'text-red-300' : 'text-emerald-300'}`}>{note.title.includes('Debit') ? '−' : '+'}{amount}</span>}
          </span>
          <span className="line-clamp-2 block text-xs text-white/80">{note.text}</span>
        </span>
      </button>
    </div>
  );
}
