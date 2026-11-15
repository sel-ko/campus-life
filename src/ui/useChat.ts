import { useMemo } from 'react';
import { chatFeed, mergeReplies, type ChatLine } from '../game/legacy/chat';
import type { GameState } from '../game/legacy/types';
import { useGameStore } from '../store/gameStore';

/** The department group chat so far, with the player's replies, and how many
 *  classmate messages are unread. */
export function useChat(game: GameState): { lines: ChatLine[]; classmateCount: number; unread: number } {
  const replies = useGameStore((s) => s.chatReplies);
  const read = useGameStore((s) => s.chatRead);
  const { day, slotIndex } = game;
  const { nickname, departmentId } = game.player;
  const feed = useMemo(() => chatFeed({ day, slotIndex, player: { nickname, departmentId } }), [day, slotIndex, nickname, departmentId]);
  const lines = useMemo(() => mergeReplies(feed, replies), [feed, replies]);
  return { lines, classmateCount: feed.length, unread: Math.max(0, feed.length - read) };
}
