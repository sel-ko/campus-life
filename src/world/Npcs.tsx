// Students who stroll between buildings along the paths, pause, then move on.
// Movement lives in refs and useFrame, never in React state.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Character } from './characters/Character';
import { randomLook, type CharacterLook } from './characters/look';
import { walkGraph } from './layout';
import { Blob } from './Player';
import { seededRandom } from './three-utils';

const NPC_COUNT = 6;
const SPEED = 2.4;
const SCALE = 0.85;

function Npc({ look, phase, startNode, seed }: { look: CharacterLook; phase: number; startNode: number; seed: number }) {
  const graph = useMemo(walkGraph, []);
  const group = useRef<THREE.Group>(null);
  const walking = useRef(false);
  const rand = useMemo(() => seededRandom(seed), [seed]);
  const state = useRef({
    node: startNode,
    next: startNode,
    pos: new THREE.Vector3(graph[startNode]!.at[0], 0, graph[startNode]!.at[1]),
    wait: rand() * 4,
  });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = state.current;
    const g = group.current;
    if (!g) return;
    if (s.wait > 0) {
      s.wait -= dt;
      walking.current = false;
      if (s.wait <= 0) {
        // Pick a neighbouring spot along a road or footpath.
        const options = graph[s.node]!.next;
        s.next = options[Math.floor(rand() * options.length)] ?? s.node;
      }
    } else {
      const [tx, tz] = graph[s.next]!.at;
      const dx = tx - s.pos.x;
      const dz = tz - s.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.1) {
        s.node = s.next;
        s.wait = 1.5 + rand() * 5;
      } else {
        const step = Math.min(dist, SPEED * dt);
        s.pos.x += (dx / dist) * step;
        s.pos.z += (dz / dist) * step;
        g.rotation.y = Math.atan2(dx, dz);
        walking.current = true;
      }
    }
    g.position.copy(s.pos);
  });

  return (
    <group ref={group}>
      <Blob scale={0.9} />
      <group scale={SCALE}>
        <Character look={look} walking={walking} phase={phase} />
      </group>
    </group>
  );
}

export function Npcs() {
  const people = useMemo(() => {
    const rand = seededRandom(42);
    const nodes = walkGraph().length;
    return Array.from({ length: NPC_COUNT }, (_, i) => ({
      look: randomLook(rand),
      phase: i * 1.3,
      startNode: Math.floor(rand() * nodes),
      seed: 100 + i,
    }));
  }, []);
  return (
    <group>
      {people.map((p, i) => (
        <Npc key={i} {...p} />
      ))}
    </group>
  );
}
