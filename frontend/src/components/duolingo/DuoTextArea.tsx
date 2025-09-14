import * as React from "react";
import { cn } from "@/lib/utils";

export interface DuoTextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const DuoTextArea = React.forwardRef<HTMLTextAreaElement, DuoTextAreaProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="flex w-full flex-col gap-2">
        {label && (
          <span className="font-feather text-[20px] text-white/95">{label}</span>
        )}
        <textarea
          ref={ref}
          className={cn(
            "font-feather min-h-28 w-full rounded-[18px] border border-white/10 bg-white/5 p-5 text-[18px] text-white/95 placeholder:text-white/40 outline-none transition focus:border-white/25 focus:bg-white/7",
            className
          )}
          {...props}
        />
      </label>
    );
  }
);

DuoTextArea.displayName = "DuoTextArea";

export default DuoTextArea;


