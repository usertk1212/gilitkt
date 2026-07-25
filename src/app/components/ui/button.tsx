import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  // TDS Buttons: 8px radius, Body 2 (16/22) Bold label, flat fills only.
  // `disabled:opacity-50` is replaced by real Disabled-Surface tokens per the
  // spec — the TDS disabled state is a specific grey fill, not a faded copy of
  // whatever variant you started from.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] text-[16px] leading-[22px] font-bold transition-all disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:bg-[var(--pp-bg-disabled)] disabled:text-[var(--pp-text-disabled)]",
  {
    variants: {
      variant: {
        /* TDS 01 Primary — solid High Blue, Static White label.
           :pressed in the spec is a LIGHTER fill (B300-ish), not a darker one,
           which is why this uses b300 on active instead of the usual /90 dim. */
        default:
          "bg-[var(--pp-bg-blue-high)] text-[var(--pp-text-static-white)] hover:bg-[var(--pp-b500)] active:bg-[var(--pp-b300)]",

        /* TDS 02 Secondary — Low Blue fill, Active-blue label */
        secondary:
          "bg-[var(--pp-bg-blue-low)] text-[var(--pp-text-active)] hover:bg-[var(--pp-b200)] active:bg-[var(--pp-b200)]",

        /* TDS 03 Tertiary — no fill until pressed, Active-blue label */
        ghost:
          "bg-transparent text-[var(--pp-text-active)] hover:bg-[var(--pp-bg-blue-low)] active:bg-[var(--pp-bg-blue-low)]",

        /* TDS 04 Invert — no fill, High-Emphasis label; pressed picks up Low Blue */
        outline:
          "border border-[var(--pp-stroke-disabled)] bg-[var(--pp-bg-base)] text-[var(--pp-text-high)] hover:bg-[var(--pp-bg-sunken)] active:bg-[var(--pp-bg-blue-low)]",

        /* TDS 05 Alert — Low Red fill, Alert-red label. Pressed goes to the
           stronger High Red fill, matching the spec's darker pressed swatch. */
        destructive:
          "bg-[var(--pp-bg-red-low)] text-[var(--pp-text-alert)] hover:bg-[var(--pp-r200)] active:bg-[var(--pp-bg-red-high)] active:text-[var(--pp-text-static-white)] focus-visible:ring-[var(--pp-stroke-alert)]/30",

        link: "text-[var(--pp-text-active)] underline-offset-4 hover:underline",
      },
      size: {
        /* sm drops to Body 3 (14/20); the rest keep Body 2 from the base class. */
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-[8px] gap-1.5 px-3 text-[14px] leading-[20px] has-[>svg]:px-2.5",
        lg: "h-12 rounded-[8px] px-6 text-[18px] leading-[24px] has-[>svg]:px-4",
        icon: "size-10 rounded-[8px]",
      },
    },
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