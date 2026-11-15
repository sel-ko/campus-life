// Draws a shareable card (1080 x 1350, WhatsApp/Instagram portrait) for
// clearance, a semester's results or graduation. Plain canvas 2D.
import { university } from '../content/university';
import { GAME_NAME } from './site';

export interface ShareCardData {
  /** Small line at the top, e.g. "CLEARANCE COMPLETE". */
  kicker: string;
  name: string;
  subtitle: string;
  /** The big number or word. */
  big: string;
  bigLabel: string;
  /** Up to four short facts. */
  lines: string[];
  badge?: string;
  url: string;
  /** Text for the WhatsApp message. */
  message: string;
}

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
const FONT = 'system-ui, "Segoe UI", Roboto, sans-serif';

function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, max: number) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (ctx.measureText(text).width > max && s > 18) {
    s -= 4;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
}

export function drawShareCard(canvas: HTMLCanvasElement, data: ShareCardData): void {
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const accent = university.colours.accent;
  const cx = CARD_WIDTH / 2;
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bg.addColorStop(0, university.colours.primary);
  bg.addColorStop(0.55, '#14202B');
  bg.addColorStop(1, '#0C141B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#FFFFFF';
  for (const [x, y, w] of [[60, 180, 140], [880, 120, 120], [820, 1040, 180], [80, 1100, 110]] as const) ctx.fillRect(x, y, w, w);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';

  ctx.fillStyle = accent;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText(`${university.shortName} · ${GAME_NAME.toUpperCase()}`, cx, 110);
  ctx.fillStyle = '#B4C2CC';
  fit(ctx, data.kicker, 700, 38, 940);
  ctx.fillText(data.kicker, cx, 170);
  ctx.fillStyle = '#F2EEE3';
  fit(ctx, data.name, 800, 84, 940);
  ctx.fillText(data.name, cx, 280);
  ctx.fillStyle = '#B4C2CC';
  fit(ctx, data.subtitle, 500, 38, 940);
  ctx.fillText(data.subtitle, cx, 336);

  ctx.fillStyle = '#B4C2CC';
  ctx.font = `600 38px ${FONT}`;
  ctx.fillText(data.bigLabel, cx, 450);
  ctx.fillStyle = accent;
  fit(ctx, data.big, 900, 230, 980);
  ctx.fillText(data.big, cx, 660);

  if (data.badge) {
    fit(ctx, data.badge, 800, 56, 900);
    const tw = Math.min(ctx.measureText(data.badge).width + 80, 1000);
    ctx.fillStyle = 'rgba(245, 184, 61, 0.16)';
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, 710, tw, 96, 48);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillText(data.badge, cx, 776);
  }
  ctx.fillStyle = '#F2EEE3';
  data.lines.slice(0, 4).forEach((l, i) => {
    fit(ctx, l, 600, 40, 940);
    ctx.fillText(l, cx, 880 + i * 62);
  });
  ctx.fillStyle = '#F2EEE3';
  ctx.font = `700 38px ${FONT}`;
  ctx.fillText('Can you do better? Play at', cx, 1180);
  ctx.fillStyle = accent;
  const url = data.url.replace(/^https?:\/\//, '');
  fit(ctx, url, 800, 44, 940);
  ctx.fillText(url, cx, 1238);
  ctx.fillStyle = '#7F8F9A';
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText(`Unofficial fan-made game, not affiliated with ${university.shortName}`, cx, 1310);
}
