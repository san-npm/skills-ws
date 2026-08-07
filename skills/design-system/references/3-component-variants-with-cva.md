## 3. Component Variants with CVA

```typescript
// components/button/button.variants.ts
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  // Base styles (always applied). Covers BOTH native disabled and the
  // aria-disabled state used when rendered asChild (anchor / custom element).
  'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover',
        outline: 'border border-border bg-background hover:bg-muted',
        ghost: 'hover:bg-muted',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm gap-1.5',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2.5',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

```tsx
// components/button/button.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../utils/cn';
import { buttonVariants, type ButtonVariants } from './button.variants';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariants {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    // CAUTION: `disabled` is NOT a valid attribute on <a> or arbitrary custom
    // elements. When asChild forwards props to a non-<button>, the native
    // `disabled` is silently ignored — the element stays focusable and clickable.
    // So: only set the native `disabled` on a real <button>; for everything else
    // express the disabled state with aria-disabled + tabIndex={-1} and block clicks.
    const disabledProps = asChild
      ? {
          'aria-disabled': isDisabled || undefined,
          'data-disabled': isDisabled ? '' : undefined,
          tabIndex: isDisabled ? -1 : props.tabIndex,
          onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
            if (isDisabled) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            onClick?.(e);
          },
        }
      : { disabled: isDisabled, onClick };

    // Spread props FIRST, then disabledProps, so the guarded onClick / tabIndex
    // and aria-disabled win over anything passed in by the consumer.
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        aria-busy={loading || undefined}
        {...props}
        {...disabledProps}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';
```

> The `disabled:pointer-events-none disabled:opacity-50` base style only fires on a real `disabled` button. To dim a disabled `asChild` link, add the matching `aria-disabled` selector to the variant base: `aria-disabled:pointer-events-none aria-disabled:opacity-50`. Note `pointer-events-none` stops mouse clicks but **not** keyboard activation — that is why the `onClick` guard and `tabIndex={-1}` above are still required.

---
