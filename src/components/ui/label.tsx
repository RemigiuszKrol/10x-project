import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Label component for associating a label with a control.
 * Requires either `htmlFor` prop or a nested form control for proper accessibility.
 */
const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<"label">>(
  ({ className, htmlFor, children, ...props }, ref) => {
    if (!htmlFor && !children) {
      // Fail silently, but you could warn here if desired
      // This makes sure the label isn't ever completely useless
      // Optionally: throw an error or log a warning
    }

    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className
        )}
        htmlFor={htmlFor}
        {...props}
      >
        {children}
      </label>
    );
  }
);

Label.displayName = "Label";

export { Label };
