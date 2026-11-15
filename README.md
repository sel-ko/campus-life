# Campus Life

A mobile-first browser game about surviving one semester at university.

> Unofficial fan-made game, not affiliated with any real university.

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev      # play at http://localhost:5173
npm test         # engine tests
npm run build    # production build into dist/
```

## Where things live

| Folder | What is in it |
| --- | --- |
| `src/game/` | All game rules, as pure TypeScript. Balance numbers are in `config.ts` and `actions.ts`. |
| `src/content/university.ts` | Everything about the school: names, places, departments, slang. |
| `src/store/` | Saves the game and connects the rules to the screens. |
| `src/ui/` | The 2D screens. |
| `reference/` | Design references (not part of the game build). |

Decisions made where the brief was open are in `DECISIONS.md`.

More on deploying and adding vendors comes in Phase 6.
