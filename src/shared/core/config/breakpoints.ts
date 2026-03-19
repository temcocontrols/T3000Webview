/**
 * Breakpoints — single source of truth for all responsive logic.
 * Used by: useResponsive hook, makeStyles media queries, CSS modules.
 *
 * Platform ranges:
 *   mobile  : width < 768px
 *   tablet  : 768px ≤ width ≤ 1024px
 *   desktop : width > 1024px
 */

export const BREAKPOINTS = {
  mobile: 768,   // px — max-width for mobile
  tablet: 1024,  // px — max-width for tablet
} as const;

/** CSS media query strings for use inside makeStyles() objects */
export const MEDIA = {
  mobile:  `@media (max-width: ${BREAKPOINTS.mobile - 1}px)`,
  tablet:  `@media (max-width: ${BREAKPOINTS.tablet}px)`,
  desktop: `@media (min-width: ${BREAKPOINTS.tablet + 1}px)`,
} as const;
