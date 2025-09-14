import * as React from "react";
import { cn } from "@/lib/utils";

export type DuoButtonVariant =
  | "primary" // bright green
  | "secondary" // outlined muted
  | "danger" // red
  | "ghost"; // subtle

export interface DuoButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: DuoButtonVariant;
  size?: "md" | "lg";
  shadow?: boolean;
}

const baseStyles =
  "font-feather rounded-[28px] inline-flex items-center justify-center transition-transform active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/40 dark:focus-visible:ring-white/30";

const sizes: Record<NonNullable<DuoButtonProps["size"]>, string> = {
  md: "h-12 px-8 text-[18px]",
  lg: "h-16 px-10 text-[22px]",
};

const variants: Record<DuoButtonVariant, string> = {
  primary:
    "bg-[#8de21d] text-[#0e1b1d] shadow-[0_6px_0_#6bb315] hover:brightness-105 disabled:opacity-50",
  secondary:
    "bg-transparent text-white/90 border-2 border-white/15 hover:border-white/25",
  danger:
    "bg-[#ff4b4b] text-white shadow-[0_6px_0_#c53a3a] hover:brightness-105",
  ghost: "bg-white/5 text-white hover:bg-white/10",
};

export const DuoButton = React.forwardRef<HTMLButtonElement, DuoButtonProps>(
  ({ className, variant = "primary", size = "lg", shadow = true, children, ...props }, ref) => {
    const style = cn(
      baseStyles,
      sizes[size],
      variants[variant],
      shadow && variant !== "secondary" && variant !== "ghost" && "drop-shadow-[0_12px_0_rgba(0,0,0,0.12)]",
      className
    );
    return (
      <button ref={ref} className={style} {...props}>
        {children}
      </button>
    );
  }
);

DuoButton.displayName = "DuoButton";

export default DuoButton;


