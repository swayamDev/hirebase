import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="font-mono text-xs tracking-[0.25em] text-muted-foreground uppercase">
        404
      </p>
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Page not found
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist, or you don&apos;t have access
        to it.
      </p>
      <Button render={<Link href="/dashboard" />}>Back to dashboard</Button>
    </main>
  );
}
