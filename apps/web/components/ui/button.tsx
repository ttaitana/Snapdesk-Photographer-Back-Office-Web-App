import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground border-2 border-ink shadow-hard-sm hover:translate-y-[1px] hover:shadow-none",
        primary:
          "bg-primary text-primary-foreground border-2 border-ink shadow-hard-sm hover:translate-y-[1px] hover:shadow-none",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // P10 micro-interaction pass (TASKS.md, SPEC.md §3.4: "haptic-feel"
        // on press) — outline is the most-used non-primary variant (cancel,
        // pagination, filter toggles, ...), so it gets the same hard-shadow
        // press effect as default/primary instead of just the bare
        // hover:bg-secondary it had before.
        outline:
          "border-2 border-ink bg-background shadow-hard-sm hover:translate-y-[1px] hover:bg-secondary hover:shadow-none",
        secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
