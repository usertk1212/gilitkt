import { memo, type SVGProps } from "react";

/*
 * The tick-in-a-circle the link chip shows once a URL has been copied.
 *
 * Hand-authored alongside HandWave rather than added to ./figma.tsx, which the
 * icon generator rewrites wholesale on every export. The design's fill is
 * #088942; it is currentColor here so the glyph takes its colour from the chip.
 */
export const CheckCircle = memo(function CheckCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M17.5006 9.99967C17.5006 5.85754 14.1428 2.49967 10.0007 2.49967C5.85851 2.49967 2.50065 5.85754 2.50065 9.99967C2.50065 14.1418 5.85851 17.4997 10.0007 17.4997C14.1428 17.4997 17.5006 14.1418 17.5006 9.99967ZM13.1615 6.91048C13.4869 6.58504 14.0144 6.58504 14.3398 6.91048C14.6653 7.23592 14.6653 7.76343 14.3398 8.08887L9.33984 13.0889C9.01441 13.4143 8.48689 13.4143 8.16146 13.0889L5.66146 10.5889C5.33602 10.2634 5.33602 9.73592 5.66146 9.41048C5.98689 9.08504 6.51441 9.08504 6.83984 9.41048L8.75065 11.3213L13.1615 6.91048ZM19.1673 9.99967C19.1673 15.0623 15.0633 19.1663 10.0007 19.1663C4.93804 19.1663 0.833984 15.0623 0.833984 9.99967C0.833984 4.93706 4.93804 0.833008 10.0007 0.833008C15.0633 0.833008 19.1673 4.93706 19.1673 9.99967Z"
        fill="currentColor"
      />
    </svg>
  );
});
