import * as React from "react";
import { cn } from "@/lib/utils";

export interface DuoChoiceCardProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  index?: number;
  selected?: boolean;
}

export const DuoChoiceCard = React.forwardRef<
  HTMLButtonElement,
  DuoChoiceCardProps
>(({ className, children, index, selected = false, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "group relative w-full rounded-[22px] border-2 px-6 py-6 text-left transition-colors",
        "font-feather text-[24px]",
        selected
          ? "border-[#2aa3ff] bg-[#0e1b1d] text-[#69c0ff]"
          : "border-white/12 bg-white/5 text-white/90 hover:border-white/22",
        className
      )}
      {...props}
    >
      {typeof index === "number" && (
        <span
          className={cn(
            "absolute left-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-[10px] border",
            selected ? "border-[#2aa3ff] text-[#2aa3ff]" : "border-white/20 text-white/50"
          )}
        >
          {index}
        </span>
      )}
      <div className={cn(typeof index === "number" ? "pl-10" : undefined)}>
        {children}
      </div>
    </button>
  );
});

DuoChoiceCard.displayName = "DuoChoiceCard";

export default DuoChoiceCard;


