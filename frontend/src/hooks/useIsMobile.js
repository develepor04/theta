import { useState, useEffect } from 'react';

/**
 * Tracks whether the viewport is at/below `breakpoint` px. Needed because
 * most pages in this app lay out with inline styles (grid columns, fixed
 * side-panel widths, flex direction) rather than CSS classes -- inline
 * styles always win over stylesheet media queries, so those properties can
 * only be made responsive by branching in JS on the live viewport width.
 */
export default function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [breakpoint]);

  return isMobile;
}
