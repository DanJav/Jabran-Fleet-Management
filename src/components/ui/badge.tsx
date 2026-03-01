import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-gray-50 text-gray-600 ring-gray-200/80",
        success: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
        warning: "bg-amber-50 text-amber-700 ring-amber-200/60",
        danger: "bg-red-50 text-red-700 ring-red-200/60",
        accent: "bg-violet-50 text-violet-700 ring-violet-200/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
