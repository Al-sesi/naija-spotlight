import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="mt-auto bg-background border-t">
      <div className="container py-6">
        <Separator className="mb-4" />
        <p className="text-center text-xs text-muted-foreground">
          ALL RIGHTS RESERVED. NAIJALIFT.
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          For advertising or sponsored listings, contact naijalift01@gmail.com or call 09070899927.
        </p>
      </div>
    </footer>
  );
}
