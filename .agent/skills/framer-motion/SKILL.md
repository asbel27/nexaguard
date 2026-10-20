---
name: framer-motion
description: Build fluid, physics-based UI animations, page transitions, layout morphing, and gesture interactions using Framer Motion (motion / motion.dev). Use when implementing interactive motion in React, Next.js, or modern frontend components.
---

# Framer Motion (Motion) Guidelines & Recipes

Framer Motion (now officially known as **Motion** / `motion.dev`) is the gold standard for React and web animations.

---

## 1. Core Principles

1. **Hardware Acceleration**: Always animate `transform` (`transform: "translateX(100px)"` or `scale`, `opacity`) to avoid layout recalculation.
2. **Spring Physics Over Durations**: Physical springs (`stiffness`, `damping`, `mass`) feel natural and interruptible, whereas fixed cubic-bezier curves can feel mechanical when interrupted.
3. **Never `scale(0)`**: Enter from `scale(0.92)` or `scale(0.95)` with `opacity: 0`. Real-world objects don't appear out of an infinitely small point.
4. **Fast & Tactile**: Micro-interactions must complete in 120ms - 200ms. Modals and drawers in 200ms - 320ms.

---

## 2. Spring Presets (Emil Kowalski / iOS Standards)

```typescript
// Snappy / Responsive (Buttons, toggles, micro-interactions)
export const snappySpring = {
  type: "spring",
  stiffness: 500,
  damping: 35,
  mass: 0.8
};

// Gentle / Organic (Modals, cards, dropdowns)
export const gentleSpring = {
  type: "spring",
  stiffness: 300,
  damping: 28,
  mass: 1
};

// Bouncy / Playful (Badges, celebrations - use sparingly)
export const bouncySpring = {
  type: "spring",
  stiffness: 400,
  damping: 20
};
```

---

## 3. Essential Patterns

### A. Layout Morphing (Shared Element Transition)
Use `layoutId` to morph an active pill/tab across navigation items smoothly:

```tsx
import { motion } from 'framer-motion';

function Tabs({ items, activeId, setActiveId }) {
  return (
    <div className="flex gap-2 p-1 bg-neutral-900 rounded-xl">
      {items.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveId(tab.id)}
          className="relative px-4 py-2 text-sm font-medium text-white"
        >
          {activeId === tab.id && (
            <motion.div
              layoutId="activeTabPill"
              className="absolute inset-0 bg-neutral-800 rounded-lg shadow-sm"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
```

### B. Exit Animations with AnimatePresence
Always set `mode="wait"` or `mode="popLayout"` for smooth replacements:

```tsx
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence mode="wait">
  {isOpen && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 8 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="modal-box"
    >
      Modal Content
    </motion.div>
  )}
</AnimatePresence>
```

### C. Gesture & Hover (Tactile Feedback)
```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 500, damping: 25 }}
  className="btn-primary"
>
  Click Me
</motion.button>
```

---

## 4. Performance & Accessibility

* **`useReducedMotion()`**: Always wrap animations or use CSS media queries to respect user accessibility preferences:
  ```tsx
  import { useReducedMotion } from 'framer-motion';
  const shouldReduceMotion = useReducedMotion();
  ```
* **Lazy Motion**: In large Next.js apps, use `<LazyMotion features={domAnimation}>` to reduce initial bundle size by ~20KB.
