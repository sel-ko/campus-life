// Debug map (only with ?debug=1): a top-down, true-to-scale drawing of the
// campus layout with building ids on the ground, to compare with a real map.
// North is up, east is right. Drag to pan, wheel or pinch to zoom, tap a
// building for its details. Loaded lazily, so it costs players nothing.
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from 'react';
import type { BuildingKind } from '../../content/campus-data';
import { buildCampusLayout, zoneOverlaps, type LayoutBuilding, type Pt } from '../../world/campusLayout';
import { KIND_COLOURS, ROAD_COLOURS } from '../../world/campusStyle';

const GAPS = [0.35, 0.6, 1];

const pts = (p: Pt[]) => p.map(([x, z]) => `${x.toFixed(2)},${z.toFixed(2)}`).join(' ');

export default function CampusDebugView({ onClose }: { onClose: () => void }) {
  const [gap, setGap] = useState(0.35);
  const [selected, setSelected] = useState<LayoutBuilding | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const layout = useMemo(() => buildCampusLayout({ gapShrink: gap }), [gap]);
  const overlapIds = useMemo(() => new Set(zoneOverlaps(layout).flat()), [layout]);
  const fallbackCount = layout.buildings.filter((b) => b.usedFallback).length;

  // The view: centre point and pixels per scene unit.
  const box = useRef<HTMLDivElement>(null);
  const b = layout.bounds;
  const fit = () => {
    const w = box.current?.clientWidth ?? window.innerWidth;
    const h = box.current?.clientHeight ?? window.innerHeight;
    return { cx: (b.minX + b.maxX) / 2, cz: (b.minZ + b.maxZ) / 2, ppu: Math.min(w / (b.maxX - b.minX + 20), h / (b.maxZ - b.minZ + 20)) };
  };
  const [view, setView] = useState(fit);
  // Refit whenever the layout changes (switching GAP_SHRINK moves the zones).
  useEffect(() => setView(fit()), [layout]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; ppu: number } | null>(null);
  const dragged = useRef(false);

  const w = box.current?.clientWidth ?? window.innerWidth;
  const h = box.current?.clientHeight ?? window.innerHeight;
  const vb = `${view.cx - w / 2 / view.ppu} ${view.cz - h / 2 / view.ppu} ${w / view.ppu} ${h / view.ppu}`;
  const px = (n: number) => n / view.ppu; // screen pixels to scene units

  function onDown(e: RPE) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers refuse capture for synthetic pointers; dragging still works.
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
    if (pointers.current.size === 2) {
      const [a, c] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a!.x - c!.x, a!.y - c!.y), ppu: view.ppu };
    }
  }
  function onMove(e: RPE) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, c] = [...pointers.current.values()];
      const d = Math.hypot(a!.x - c!.x, a!.y - c!.y);
      setView((v) => ({ ...v, ppu: Math.min(80, Math.max(0.5, (pinch.current!.ppu * d) / pinch.current!.d)) }));
      dragged.current = true;
    } else if (pointers.current.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragged.current = true;
      setView((v) => ({ ...v, cx: v.cx - dx / v.ppu, cz: v.cz - dy / v.ppu }));
    }
  }
  function onUp(e: RPE) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  const kinds = Object.keys(KIND_COLOURS) as BuildingKind[];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#E8EDE2] text-night">
      <header className="flex flex-wrap items-center gap-2 bg-night px-3 py-2 text-ink">
        <strong className="mr-auto text-sm">Campus debug map</strong>
        <span className="text-xs text-muted">GAP_SHRINK</span>
        {GAPS.map((g) => (
          <button key={g} onClick={() => setGap(g)} className={`min-h-9 rounded-full px-3 text-sm font-semibold ${gap === g ? 'bg-sun text-night' : 'bg-panel'}`}>
            {g}
          </button>
        ))}
        <button onClick={() => setShowLegend((s) => !s)} className="min-h-9 rounded-full bg-panel px-3 text-sm">
          Key
        </button>
        <button onClick={() => setView(fit())} className="min-h-9 rounded-full bg-panel px-3 text-sm">
          Fit
        </button>
        <button onClick={onClose} className="min-h-9 rounded-full bg-panel px-3 text-sm">
          Close
        </button>
      </header>
      <p className={`px-3 py-1 text-xs ${overlapIds.size ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-900'}`}>
        {layout.buildings.length} buildings · {layout.roads.length} roads · {fallbackCount} outlines replaced by rectangles ·{' '}
        {overlapIds.size ? `${overlapIds.size} buildings overlap another zone (red outline)` : 'no zones overlap'} · 1 grid square = 10 units ({(10 / layout.worldScale).toFixed(0)} m)
      </p>

      <div
        ref={box}
        className="relative min-h-0 flex-1 touch-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={(e) => {
          // Zoom toward the mouse: the spot under the pointer stays put.
          const r = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - r.left - r.width / 2;
          const my = e.clientY - r.top - r.height / 2;
          setView((v) => {
            const ppu = Math.min(80, Math.max(0.5, v.ppu * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
            return { ppu, cx: v.cx + mx / v.ppu - mx / ppu, cz: v.cz + my / v.ppu - my / ppu };
          });
        }}
      >
        <svg className="absolute inset-0 size-full" viewBox={vb} preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="grid10" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M10 0H0V10" fill="none" stroke="#C9D3C0" strokeWidth={px(1)} />
            </pattern>
          </defs>
          <rect x={b.minX - 40} y={b.minZ - 40} width={b.maxX - b.minX + 80} height={b.maxZ - b.minZ + 80} fill="url(#grid10)" />

          {layout.openGround.map((g, i) => (
            <polygon key={i} points={pts(g.points)} fill="#B9D99A" stroke="#8DB36B" strokeWidth={px(1)} />
          ))}
          <polygon points={pts(layout.track)} fill="#8CCB74" stroke="#D9653B" strokeWidth={0.6} />

          {layout.roads.map((r, i) => (
            <polyline
              key={i}
              points={pts(r.points)}
              fill="none"
              stroke={ROAD_COLOURS[r.certainty]}
              strokeWidth={Math.max(r.width, px(1.5))}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={r.certainty === 'traced' ? undefined : `${px(6)} ${px(4)}`}
              opacity={r.zone === 'link' ? 0.6 : 0.9}
            >
              <title>{`${r.name} (${r.certainty})`}</title>
            </polyline>
          ))}

          {layout.buildings.map((bd) => {
            const overlap = overlapIds.has(bd.id);
            return (
              <polygon
                key={bd.id}
                points={pts(bd.footprint)}
                fill={KIND_COLOURS[bd.kind]}
                stroke={overlap || bd.usedFallback ? '#E11D48' : selected?.id === bd.id ? '#111' : '#3B3B46'}
                strokeWidth={overlap || selected?.id === bd.id ? px(2.5) : px(0.8)}
                strokeDasharray={bd.usedFallback ? `${px(4)} ${px(3)}` : undefined}
                onClick={() => !dragged.current && setSelected(bd)}
              />
            );
          })}

          {layout.buildings.map((bd) => (
            <text
              key={bd.id}
              x={bd.center[0]}
              y={bd.center[1]}
              fontSize={px(10)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#111"
              stroke="#fff"
              strokeWidth={px(2.5)}
              paintOrder="stroke"
              style={{ pointerEvents: 'none', fontFamily: 'system-ui', fontWeight: 600 }}
            >
              {bd.id}
            </text>
          ))}

          {layout.markers.map((m) => (
            <g key={m.name} style={{ pointerEvents: 'none' }}>
              <circle cx={m.at[0]} cy={m.at[1]} r={px(5)} fill="#E11D48" stroke="#fff" strokeWidth={px(1.5)} />
              <text x={m.at[0] + px(8)} y={m.at[1]} fontSize={px(11)} dominantBaseline="middle" fill="#7F1D1D" stroke="#fff" strokeWidth={px(2.5)} paintOrder="stroke" style={{ fontFamily: 'system-ui', fontWeight: 700 }}>
                {m.name}
              </text>
            </g>
          ))}

          {(['ps', 'ts', 'estate'] as const).map((z) => (
            <text
              key={z}
              x={layout.zoneCentres[z][0]}
              y={layout.zoneCentres[z][1]}
              fontSize={px(26)}
              textAnchor="middle"
              fill="#1D4ED8"
              opacity={0.55}
              style={{ pointerEvents: 'none', fontFamily: 'system-ui', fontWeight: 900 }}
            >
              {z.toUpperCase()}
            </text>
          ))}
        </svg>

        <div className="pointer-events-none absolute top-3 right-3 flex flex-col items-center rounded-xl bg-white/85 px-2 py-1 text-xs font-bold shadow">
          <span aria-hidden="true">▲</span>N
        </div>

        {showLegend && (
          <div className="absolute top-3 left-3 flex flex-col gap-1 rounded-xl bg-white/90 p-3 text-xs shadow">
            {kinds.map((k) => (
              <span key={k} className="flex items-center gap-2">
                <span className="size-3 rounded-sm border border-black/30" style={{ background: KIND_COLOURS[k] }} /> {k}
              </span>
            ))}
            <span className="mt-1 flex items-center gap-2">
              <span className="h-1 w-5" style={{ background: ROAD_COLOURS.traced }} /> road (traced)
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-5 border-t-2 border-dashed" style={{ borderColor: ROAD_COLOURS.inferred }} /> inferred
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-5 border-t-2 border-dashed" style={{ borderColor: ROAD_COLOURS.unknown }} /> unknown
            </span>
          </div>
        )}

        {selected && (
          <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-night p-3 text-sm text-ink shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">
                  {selected.id} · {selected.kind}
                </p>
                <p className="text-muted">{selected.name}</p>
                <p className="text-xs text-muted">
                  {selected.floors} floor(s) · about {(selected.size[0] / layout.worldScale).toFixed(0)} × {(selected.size[1] / layout.worldScale).toFixed(0)} m · zone {selected.zone}
                  {selected.usedFallback ? ' · outline replaced by a rectangle' : ''}
                  {overlapIds.has(selected.id) ? ' · overlaps another zone' : ''}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="min-h-9 rounded-full bg-panel px-3">
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
