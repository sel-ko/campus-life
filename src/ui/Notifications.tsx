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
    const id = window.setTimeout(() => setQueue((q) => q.slice(1)), 4000);
    return () => window.clearTimeout(id);
  }, [note]);

  if (!note) return null;
  const amount = note.thread === 'bank' ? note.text.match(/Amt: ([^·]+)/)?.[1]?.trim() : undefined;
  const debit = note.title.includes('Debit');
  return (
    // One slim line laid exactly over the top bar row for a few seconds, so it
    // never covers the room header, quest card or alerts below it.
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[45] flex justify-center px-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-3">
      <button
        key={note.id}
        onClick={() => {
          setQueue((q) => q.slice(1));
          openPhone('chat');
        }}
        className="note-in pointer-events-auto flex h-11 w-full max-w-[560px] items-center gap-2 rounded-full border border-white/15 bg-[#1B2733]/97 pr-3 pl-1.5 text-left shadow-xl backdrop-blur"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-sm" aria-hidden="true">
          {note.thread === 'bank' ? '🏦' : '💬'}
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-xs font-bold">{note.title.replace(/^\S+\s/, '')}</span>
          <span className="truncate text-[11px] text-white/75">{note.text}</span>
        </span>
        {amount && <span className={`shrink-0 text-xs font-black ${debit ? 'text-red-300' : 'text-emerald-300'}`}>{debit ? '−' : '+'}{amount}</span>}
      </button>
    </div>
  );
}
