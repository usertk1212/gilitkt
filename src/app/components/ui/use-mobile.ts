import * as React from "react";

// tiket responsive spec: mobile is 360–839px, desktop starts at 840px.
// Was 768, which meant 768–839px got the desktop sidebar while the rest of the
// app (driven by Tailwind `lg:`) still rendered mobile — two different ideas of
// "mobile" fighting each other.
const MOBILE_BREAKPOINT = 840;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
