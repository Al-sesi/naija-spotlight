import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="mt-auto bg-background border-t">
      <div className="container px-4 sm:px-6 py-4 sm:py-6">
        <Separator className="mb-3 sm:mb-4" />
        <p className="text-center text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
          ALL RIGHTS RESERVED. NAIJALIFT.
        </p>
        <p className="mt-2 text-center text-[10px] sm:text-xs text-muted-foreground leading-relaxed break-words">
          For advertising or sponsored listings, contact{" "}
          <a
            href="mailto:naijalift01@gmail.com"
            className="underline-offset-2 hover:underline hover:text-foreground transition-colors"
          >
            naijalift01@gmail.com
          </a>{" "}
          or call{" "}
          <a
            href="tel:09070899927"
            className="underline-offset-2 hover:underline hover:text-foreground transition-colors whitespace-nowrap"
          >
            09070899927
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
