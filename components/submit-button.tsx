"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Submit button for server-rendered <form action={…}> forms: disables itself
 * and shows a spinner while the bound server action is in flight.
 */
export function SubmitButton({
  children,
  disabled,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? <Spinner /> : null}
      {children}
    </Button>
  );
}
