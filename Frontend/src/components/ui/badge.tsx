import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground border-border",
        new: "border-transparent bg-grape text-grape-foreground",
        learning: "border-transparent bg-sun text-sun-foreground",
        review: "border-transparent bg-sky text-sky-foreground",
        mastered: "border-transparent bg-mint text-mint-foreground",
        again: "border-transparent bg-coral text-coral-foreground",
        hard: "border-transparent bg-sun text-sun-foreground",
        good: "border-transparent bg-sky text-sky-foreground",
        easy: "border-transparent bg-mint text-mint-foreground",
        "mint-soft": "border-transparent bg-mint/20 text-foreground",
        "sun-soft": "border-transparent bg-sun/30 text-foreground",
        "coral-soft": "border-transparent bg-coral/20 text-foreground",
        "grape-soft": "border-transparent bg-grape/15 text-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
