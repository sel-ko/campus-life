// Draws the shareable results card (1080 x 1350, Instagram/WhatsApp portrait)
// onto a canvas. Plain canvas 2D, no libraries.
import { university } from '../content/university';
import { naira } from '../game/format';
import type { SemesterResult } from '../game/types';
import { GAME_NAME } from './site';

export interface ShareCardData {
  nickname: string;
  department: string;
  result: SemesterResult;
  money: number;
  url: string;
}

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const FONT = 'system-ui, "Segoe UI", Roboto, sans-serif';

/** Shrinks the font until the text fits in maxWidth. */
function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (ctx.measureText(text).width > maxWidth && s > 20) {
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

  // Background: dusk gradient with the school colour.
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bg.addColorStop(0, university.colours.primary);
  bg.addColorStop(0.55, '#14202B');
  bg.addColorStop(1, '#0C141B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // A few chunky "blocks" as decoration.
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#FFFFFF';
  for (const [x, y, w] of [[60, 180, 140], [880, 120, 120], [820, 1040, 180], [80, 1100, 110]] as const) {
    ctx.fillRect(x, y, w, w);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Header
  ctx.fillStyle = accent;
  ctx.font = `800 44px ${FONT}`;
  ctx.fillText(`${university.shortName} · ${GAME_NAME.toUpperCase()}`, cx, 130);

  ctx.fillStyle = '#F2EEE3';
  fitText(ctx, data.nickname, 800, 84, 940);
  ctx.fillText(data.nickname, cx, 250);
  ctx.fillStyle = '#B4C2CC';
  fitText(ctx, data.department, 500, 40, 940);
  ctx.fillText(data.department, cx, 310);

  // CGPA
  ctx.fillStyle = '#B4C2CC';
  ctx.font = `600 40px ${FONT}`;
  ctx.fillText('SEMESTER CGPA', cx, 450);
  ctx.fillStyle = accent;
  ctx.font = `900 260px ${FONT}`;
  ctx.fillText(data.result.cgpa.toFixed(2), cx, 680);
  ctx.fillStyle = '#F2EEE3';
  fitText(ctx, data.result.className, 800, 64, 940);
  ctx.fillText(data.result.className, cx, 780);

  // Title badge
  ctx.font = `800 56px ${FONT}`;
  const titleText = `“${data.result.title}”`;
  fitText(ctx, titleText, 800, 56, 900);
  const tw = Math.min(ctx.measureText(titleText).width + 80, 1000);
  ctx.fillStyle = 'rgba(245, 184, 61, 0.16)';
  roundRect(ctx, cx - tw / 2, 850, tw, 100, 50);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillText(titleText, cx, 920);
  ctx.fillStyle = '#B4C2CC';
  fitText(ctx, data.result.titleBlurb, 500, 36, 940);
  ctx.fillText(data.result.titleBlurb, cx, 1010);

  ctx.fillStyle = '#F2EEE3';
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText(`Money left: ${naira(data.money)}`, cx, 1090);

  // Footer
  ctx.fillStyle = '#F2EEE3';
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText('Can you beat me? Play at', cx, 1200);
  ctx.fillStyle = accent;
  fitText(ctx, data.url.replace(/^https?:\/\//, ''), 800, 44, 940);
  ctx.fillText(data.url.replace(/^https?:\/\//, ''), cx, 1258);
  ctx.fillStyle = '#7F8F9A';
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText(`Unofficial fan-made game, not affiliated with ${university.shortName}`, cx, 1318);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function shareMessage(data: ShareCardData): string {
  return (
    `I finished my semester at ${university.shortName} with a ${data.result.cgpa.toFixed(2)} CGPA ` +
    `(${data.result.className}) and got the title "${data.result.title}" in ${GAME_NAME}. ` +
    `Can you beat me? ${data.url}`
  );
}
