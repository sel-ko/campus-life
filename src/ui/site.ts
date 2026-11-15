// App-wide constants that are not game rules and not school content.

export const GAME_NAME = 'Campus Life';

/** The public link to the game, used on the share card and in messages.
 *  Set VITE_GAME_URL in .env once the site is deployed. */
export function gameUrl(): string {
  return import.meta.env.VITE_GAME_URL || window.location.origin;
}

/** Opens WhatsApp. With a phone number it opens a chat with that number;
 *  without one the player picks who to send it to. */
export function whatsappLink(text: string, phone?: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
