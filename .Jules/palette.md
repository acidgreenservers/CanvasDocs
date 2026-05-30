## 2025-05-30 - [Aria state for selection buttons]
**Learning:** Selection buttons that toggle between mutually exclusive options (like node types) must indicate their state to assistive technologies using `aria-pressed`. Visual indicators (like color changes) are insufficient for screen reader users.
**Action:** Always include `aria-pressed` or `aria-selected` when implementing tab-like or toggle buttons in the design system.
