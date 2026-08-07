import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

/*
 * The three filled variants get their surface from .btn-gs (globals.css), which
 * paints the fill and the 1px gradient stroke as two background layers. They
 * therefore carry no bg-* utility here — background is already spoken for, and
 * a Tailwind bg-* would be silently ignored. Only the label and icon colour,
 * which are ordinary colour properties, stay in Tailwind.
 *
 * Sizes map onto Figma's Big / Med / Small as lg / default / sm. Vertical
 * padding is one pixel under the drawn value on each side because Figma strokes
 * inside the frame while CSS adds the border outside the padding box: Big is
 * 1 + 13 + 24 + 13 + 1 = 52, Med 44, Small 32. Horizontal padding is short by
 * the same pixel for the same reason.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-all disabled:pointer-events-none [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:text-[var(--pp-text-disabled)]",
  {
    variants: {
      variant: {
        /* 01 Primary — High Blue fill, white label and icon, white stroke. */
        default: "btn-gs btn-gs-primary text-[var(--pp-text-static-white)]",

        /* 02 Secondary — Low Blue fill, Active-blue label and icon. */
        secondary: "btn-gs btn-gs-secondary text-[var(--pp-text-active)]",

        /* 03 Invert — base surface fill, High-Emphasis label, neutral stroke. */
        outline: "btn-gs btn-gs-invert text-[var(--pp-text-high)]",

        /* 04 Brand — Invert's surface under the blue-to-yellow superuser
           stroke. A new key rather than a variation of `outline`, so the two
           cannot be confused at a call site. */
        brand: "btn-gs btn-gs-brand text-[var(--pp-text-high)]",

        /* Tertiary — no fill until pressed, Active-blue label. No stroke, so it
           keeps ordinary background utilities. */
        ghost:
          "rounded-[8px] bg-transparent text-[var(--pp-text-active)] hover:bg-[var(--pp-bg-blue-low)] active:bg-[var(--pp-bg-blue-low)] disabled:bg-[var(--pp-bg-disabled)]",

        /* Alert — Low Red fill, Alert-red label; pressed goes to the stronger
           High Red fill, matching the spec's darker pressed swatch. */
        destructive:
          "rounded-[8px] bg-[var(--pp-bg-red-low)] text-[var(--pp-text-alert)] hover:bg-[var(--pp-r200)] active:bg-[var(--pp-bg-red-high)] active:text-[var(--pp-text-static-white)] focus-visible:ring-[var(--pp-stroke-alert)]/30 disabled:bg-[var(--pp-bg-disabled)]",

        link: "text-[var(--pp-text-active)] underline-offset-4 hover:underline",
      },
      size: {
        /* Med */
        default:
          "rounded-[8px] px-[19px] py-[10px] text-[16px] leading-[1.38] [&_svg:not([class*='size-'])]:size-5",
        /* Small */
        sm: "rounded-[8px] px-[15px] py-[5px] text-[14px] leading-[1.43] [&_svg:not([class*='size-'])]:size-4",
        /* Big */
        lg: "rounded-[12px] px-[19px] py-[13px] text-[18px] leading-[1.33] [&_svg:not([class*='size-'])]:size-5",
        /* Square, on Med's height. */
        icon: "size-11 rounded-[8px] [&_svg:not([class*='size-'])]:size-5",
      },
    },
    /*
     * Figma's minimum widths belong to the four stroked variants, not to the
     * sizes. Hanging them off size instead would stretch every icon-only ghost
     * button — the panel and modal close buttons, mostly — out to 84px.
     */
    compoundVariants: [
      { variant: "default", size: "sm", className: "min-w-[84px]" },
      { variant: "secondary", size: "sm", className: "min-w-[84px]" },
      { variant: "outline", size: "sm", className: "min-w-[84px]" },
      { variant: "brand", size: "sm", className: "min-w-[84px]" },
      { variant: "default", size: "default", className: "min-w-[84px]" },
      { variant: "secondary", size: "default", className: "min-w-[84px]" },
      { variant: "outline", size: "default", className: "min-w-[84px]" },
      { variant: "brand", size: "default", className: "min-w-[84px]" },
      { variant: "default", size: "lg", className: "min-w-[112px]" },
      { variant: "secondary", size: "lg", className: "min-w-[112px]" },
      { variant: "outline", size: "lg", className: "min-w-[112px]" },
      { variant: "brand", size: "lg", className: "min-w-[112px]" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };