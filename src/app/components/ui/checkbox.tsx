"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "../icons";

import { cn } from "./utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // 20px box, radius 4, no border. The fill is a white alpha rather than a
        // surface token because this checkbox lives on the glass menu, which is
        // dark in both themes — a token that flipped would vanish in one.
        //
        // Checking does not change the fill, only reveals the mark. That is
        // deliberate in the design; the previous build swapped to a solid blue
        // plate on check, which reads as a different control.
        "group peer size-5 shrink-0 rounded-[4px] bg-white/40 text-[var(--pp-text-static-white)] outline-none transition-opacity",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
        // Disabled dims the mark, not the plate. Fading the whole control also
        // faded its white/20 fill down to near-nothing, so a disabled checkbox
        // read as empty space; the design keeps the plate legible and drops
        // only the tick to 20%.
        "disabled:cursor-not-allowed disabled:bg-white/20",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex size-full items-center justify-center text-current transition-none group-disabled:opacity-20"
      >
        {/* 16px glyph centred in the 20px box, per the design's 2px inset. */}
        <CheckIcon className="size-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
