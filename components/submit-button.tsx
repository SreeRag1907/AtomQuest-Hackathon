"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { InlineSpinner } from "@/components/page-loading";
import { cn } from "@/lib/utils";

interface SubmitButtonProps extends ButtonProps {
  pendingLabel?: string;
}

/**
 * Drop-in replacement for <Button type="submit"> inside <form>.
 * Automatically shows spinner + disables while the server action is running.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      className={cn(className)}
      {...props}
    >
      {pending ? (
        <>
          <InlineSpinner className="mr-2" />
          {pendingLabel ?? "Working..."}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
