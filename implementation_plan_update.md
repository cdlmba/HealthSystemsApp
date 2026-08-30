# Apply TSD Premium Aesthetic to All Tabs

**Goal**: Update the entire application UI to use the Wellness Stewardship (Editorial Luxe) design system across all major components, including the legacy "Telemetry Log" (`HealthTrackingTable.tsx`). This ensures a consistent premium visual experience.

## User Review Required

> [!IMPORTANT]
> This change will replace many Tailwind utility classes with custom design‑system classes (`tsd-card`, `tsd-badge-gold`, `tsd-progress`, etc.) and update color references to the new palette variables defined in `src/index.css`. It may affect existing custom CSS overrides and some component hover/focus styles.

- Confirm that you are comfortable with a full UI redesign across all tabs.
- Ensure any custom theming you rely on (e.g., dark mode toggles) can be re‑applied after the changes.

## Open Questions

- Do you want to retain any specific custom CSS that is not covered by the new design tokens?
- Should we keep the current `geometric-card` class for the `HealthTrackingTable` container, or replace it entirely with `tsd-card`?

## Proposed Changes

---
### Component: `HealthTrackingTable.tsx`
- Replace background colors (`bg-slate‑50`, `bg-emerald‑100/70`, etc.) with `var(--tsd-cream)` or `var(--tsd-surface)` as appropriate.
- Update text colors to use `var(--tsd-forest)`, `var(--tsd-moss)`, and `var(--tsd-gold)`.
- Swap utility classes for headers and cells with the new `tsd-card`, `tsd-badge-gold`, and `tsd-progress` components.
- Refactor the week navigation header to match the style used in `App.tsx` (forest background, gold accent glow).
- Convert the metric group labels to use the `tsd-serif` font and gold/forest colors.
- Update the toggle/checkbox styling to the new gold/forest theme.
- Ensure all borders use `var(--tsd-surface-dim)`.
- Add subtle ambient blur elements similar to other tabs for visual depth.

---
### Component: `NutritionDashboard.tsx`
- Already updated in previous commit – verify consistency with new tokens.

---
### Component: `WellnessPlan.tsx`
- Already updated – ensure any leftover hard‑coded colors are replaced.

---
### Global CSS (`src/index.css`)
- Verify design‑system variables (`--tsd-cream`, `--tsd-forest`, `--tsd-gold`, etc.) are defined.
- Add utility classes: `.tsd-card`, `.tsd-badge-gold`, `.tsd-progress-track`, `.tsd-progress-fill`.

---
### Miscellaneous
- Update any remaining `bg-slate-...` or `text-slate-...` classes in other components (e.g., `SystemsCoach`, `WeeklyDashboard`).
- Run a full `npm run dev` to visually verify the new UI.

## Verification Plan

### Automated Tests
- Run existing unit tests (`npm test`). No test changes expected.

### Manual Verification
- Launch the dev server and inspect each tab (Dashboard, Telemetry Log, Nutrition, Wellness Plan, Systems Coach).
- Confirm that the color palette matches the TSD Cream/Gold/Green aesthetic.
- Verify that interactive elements (buttons, inputs, checkboxes) have the new hover/active styles.
- Check that the `HealthTrackingTable` grid aligns with the new design and remains functional.

---
*Prepared by Antigravity*
