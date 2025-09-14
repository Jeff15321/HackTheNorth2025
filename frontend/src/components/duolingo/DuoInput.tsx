import * as React from "react";
import { cn } from "@/lib/utils";

export interface DuoInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const DuoInput = React.forwardRef<HTMLInputElement, DuoInputProps>(
  ({ className, label, hint, ...props }, ref) => {
    return (
      <label className="flex w-full flex-col gap-2">
        {label && (
          <span className="font-feather text-[20px] text-white/95">{label}</span>
        )}
        <input
          ref={ref}
          className={cn(
            "font-feather h-14 w-full rounded-[18px] border border-white/10 bg-white/5 px-5 text-[20px] text-white/95 placeholder:text-white/40 outline-none transition focus:border-white/25 focus:bg-white/7",
            className
          )}
          {...props}
        />
        {hint && (
          <span className="text-sm text-white/50">{hint}</span>
        )}
      </label>
    );
  }
);

DuoInput.displayName = "DuoInput";

export default DuoInput;


