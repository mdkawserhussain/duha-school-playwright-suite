# Session Handoff: UI Redesign — js-agv8 Theme Adaptation

## Current State
- **Phase 1-2 complete**: School portal scraper + payroll integration working (commit `f6de671`)
- **js-agv8 UX fixes complete**: 26 issues fixed across 3 HTML files (review, config, index)
- **UI redesign plan approved**: CSS Custom Properties approach, dark-only, sidebar nav
- **Next step**: Execute the plan (13 files, ~800 lines changed)

## What Was Decided
1. **Dark-only** — remove light/dark toggle entirely
2. **Sidebar navigation** — fixed 240px left sidebar (replace horizontal top nav)
3. **Exact color match** with js-agv8 (`#0f172a` bg, `#38bdf8` accent)
4. **CSS Custom Properties** — define `--bg-primary`, `--accent`, etc. in `index.css`, map to Tailwind via config

## Files to Modify (13 total)

| Step | File | Change | Refs |
|------|------|--------|------|
| 1 | `web/index.html` | Add Inter font, extend Tailwind config with CSS var colors | — |
| 1 | `web/src/index.css` | Full rewrite: CSS vars, glassmorphism, sidebar CSS, remove light mode | — |
| 2 | `web/src/App.tsx` | Sidebar rewrite, remove dark toggle | — |
| 3 | `web/src/pages/Payroll.tsx` | 101 dark: replacements + 11 indigo replacements | 112 |
| 4 | `web/src/pages/Controls.tsx` | ~25 dark: + 8 indigo replacements | 33 |
| 5 | `web/src/pages/Dashboard.tsx` | ~20 light→dark + 5 indigo replacements | 25 |
| 6 | `web/src/pages/Settings.tsx` | ~18 dark: + 5 indigo replacements | 23 |
| 7 | `web/src/pages/Logs.tsx` | ~15 light→dark replacements | 15 |
| 8 | `web/src/pages/WhatsApp.tsx` | ~10 light→dark replacements | 10 |
| 9 | `web/src/pages/Trends.tsx` | ~8 light→dark replacements | 8 |
| 10 | `web/src/pages/RunHistory.tsx` | ~12 dark: replacements | 12 |
| 11 | `web/src/components/SummaryCards.tsx` | 1 indigo replacement | 1 |
| 12 | `web/src/components/DuesByClass.tsx` | ~5 light→dark replacements | 5 |

## CSS Variable Tokens (to define in index.css)
```css
--bg-primary: #0f172a;     /* page background */
--bg-secondary: #1e293b;   /* card/input bg */
--bg-card: rgba(30,41,59,0.7); /* glassmorphism */
--text-primary: #f8fafc;   /* main text */
--text-secondary: #94a3b8; /* secondary text */
--text-muted: #64748b;     /* muted text */
--accent: #38bdf8;         /* sky-blue accent */
--accent-hover: #0ea5e9;   /* accent hover */
--accent-dim: rgba(56,189,248,0.1); /* accent bg */
--border: rgba(255,255,255,0.1);    /* default border */
--border-strong: rgba(255,255,255,0.2);
```

## Tailwind Config Extension (add to index.html)
```js
tailwind.config = {
  theme: {
    extend: {
      colors: {
        'surface': { '1': 'var(--bg-primary)', '2': 'var(--bg-secondary)', '3': 'var(--bg-card)' },
        'txt': { '1': 'var(--text-primary)', '2': 'var(--text-secondary)', '3': 'var(--text-muted)' },
        'accent': { DEFAULT: 'var(--accent)', hover: 'var(--accent-hover)', dim: 'var(--accent-dim)' },
        'bdr': { DEFAULT: 'var(--border)', strong: 'var(--border-strong)' },
      },
    },
  },
}
```

## Key Replacement Patterns

### dark: → variable class
| `dark:` Class | New Class |
|--------------|-----------|
| `dark:text-white` | `text-txt-1` |
| `dark:text-gray-400` / `dark:text-gray-300` | `text-txt-2` |
| `dark:bg-gray-800` / `dark:bg-gray-700` | `bg-surface-2` |
| `dark:border-gray-700` | `border-bdr` |
| `dark:border-gray-600` | `border-bdr-strong` |
| `dark:divide-gray-700` | `divide-bdr` |
| `dark:hover:bg-*` | `hover:bg-surface-2*` |
| `dark:text-red-400` etc. | `text-red-400` (strip dark:) |

### Paired patterns (discard light, keep dark)
| Paired | New |
|--------|-----|
| `text-gray-500 dark:text-gray-400` | `text-txt-2` |
| `border-gray-200 dark:border-gray-700` | `border-bdr` |
| `bg-gray-50 dark:bg-gray-800` | `bg-surface-2` |
| `text-red-600 dark:text-red-400` | `text-red-400` |

### indigo → accent
| Current | New |
|---------|-----|
| `bg-indigo-600` | `bg-accent` |
| `hover:bg-indigo-700` | `hover:bg-accent-hover` |
| `text-indigo-600` | `text-accent` |
| `bg-indigo-100` | `bg-accent-dim` |
| `ring-indigo-500` | `ring-accent` |

## Execution Order
1. Foundation (`index.css` + `index.html`) → build verify
2. Sidebar (`App.tsx`) → build verify
3. Pages (parallelizable) → grep verify per file
4. Final build + `grep -r "dark:" src/` → 0

## Important Notes
- **Karpathy guidelines**: Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven
- **Commit after each atomic sub-task**
- **Run `npm run web:build` after each step to verify**
- **Payroll.tsx has 101 dark: refs — highest risk, do 3-pass approach**
- **Glassmorphism needs solid fallback for older browsers**
- **Mobile sidebar needs hamburger toggle at < 768px**
