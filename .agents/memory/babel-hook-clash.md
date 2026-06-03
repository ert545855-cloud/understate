---
name: Babel Global Scope Hook Clash
description: React hook re-declaration causes "Identifier already declared" error in Babel-standalone monolith
---

# Babel Global Scope Hook Clash

**Rule:** Never use `const { useState, useEffect, useContext } = React;` at the top level of any new screen or component file.

**Why:** Babel-standalone evaluates all scripts in the same global scope. `src/app.js` already declares `const { useState, useEffect, useRef, useCallback, useMemo, useReducer, createContext, useContext, Fragment } = React;` at the top level. Any new file that redeclares these names causes a `SyntaxError: Identifier 'useState' has already been declared`, which silently kills the app at the splash screen.

**How to apply:**
- New screen files (src/screens/*.js): use hooks directly — they are already in global scope from app.js.
- New component files (src/components/*.js): same rule. Remove any top-level destructuring like the one that was erroneously added to Header.js.
- If a component needs a hook under a different alias (e.g. BottomNav.js uses `useStateNav`), that is fine — aliased destructuring does not clash.
- For inline React.useState calls inside component bodies, using `React.useState(...)` directly is always safe as an alternative.
