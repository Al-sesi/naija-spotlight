import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="mt-auto bg-background border-t">
      <div className="container py-6">
        <Separator className="mb-4" />
        <p className="text-center text-xs text-muted-foreground">
          ALL RIGHTS RESERVED. NAIJALIFT.
        </p>
      </div>
    </footer>
  );
}
