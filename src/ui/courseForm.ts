// Draws the semester's course form as a PNG for "Download course form".
import { getCollege, getProgramme } from '../content/courses';
import { totalUnits } from '../game/curriculum';
import type { GameState } from '../game/types';

export function drawCourseForm(game: GameState): HTMLCanvasElement {
  const courses = game.academics.courses;
  const canvas = document.createElement('canvas');
  const W = 1240;
  const H = 520 + courses.length * 56 + 200;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const p = getProgramme(game.player.programmeId);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#111';
  ctx.textAlign = 'center';
  ctx.font = '700 40px serif';
  ctx.fillText('COURSE REGISTRATION', W / 2, 90);
  ctx.font = '600 30px serif';
  ctx.fillText(`COURSE REGISTRATION FORM · ${game.academics.level}00 LEVEL · SEMESTER ${game.clock.semester}`, W / 2, 140);
  ctx.font = '400 20px sans-serif';
  ctx.fillText('(Campus Life game. Unofficial, not a real university document.)', W / 2, 176);
  ctx.textAlign = 'left';
  ctx.font = '400 26px sans-serif';
  const info = [
    ['Name', game.player.name],
    ['Matric No', game.player.matric],
    ['Programme', p.name],
    ['College', getCollege(p.collegeId).name],
    ['Status', game.academics.registered ? `Registered${game.academics.lateRegistration ? ' (late)' : ''}` : 'NOT REGISTERED'],
  ];
  info.forEach(([k, v], i) => {
    ctx.font = '700 26px sans-serif';
    ctx.fillText(`${k}:`, 80, 240 + i * 42);
    ctx.font = '400 26px sans-serif';
    ctx.fillText(v!, 300, 240 + i * 42);
  });
  let y = 480;
  ctx.fillStyle = '#E8EEF4';
  ctx.fillRect(60, y - 36, W - 120, 52);
  ctx.fillStyle = '#111';
  ctx.font = '700 24px sans-serif';
  ctx.fillText('Code', 80, y);
  ctx.fillText('Title', 260, y);
  ctx.fillText('Units', 1040, y);
  ctx.font = '400 24px sans-serif';
  for (const c of courses) {
    y += 56;
    ctx.fillText(c.code, 80, y);
    ctx.fillText(`${c.title}${c.carryover ? ' (carryover)' : ''}`.slice(0, 62), 260, y);
    ctx.fillText(String(c.units), 1060, y);
    ctx.strokeStyle = '#DDD';
    ctx.beginPath();
    ctx.moveTo(60, y + 18);
    ctx.lineTo(W - 60, y + 18);
    ctx.stroke();
  }
  y += 70;
  ctx.font = '700 26px sans-serif';
  ctx.fillText(`Total units: ${totalUnits(courses)}`, 80, y);
  ctx.font = '400 22px sans-serif';
  ctx.fillText('Student ___________________     HOD ___________________     Date ____________', 80, y + 80);
  return canvas;
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}
