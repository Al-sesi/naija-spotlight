import { Separator } from "@/components/ui/separator";
import { MessageCircle } from "lucide-react";

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/DKZf3TXtrOdHUlwwo3vKST?s=cl&p=a&mlu=4&ilr=4";

export function Footer() {
  return (
    <footer className="mt-auto bg-background border-t">
      <div className="container px-4 sm:px-6 py-4 sm:py-6">
        <Separator className="mb-3 sm:mb-4" />

        <div className="flex justify-center mb-4">
          <a
            href={WHATSAPP_GROUP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366] text-white text-xs sm:text-sm font-semibold shadow-md hover:bg-[#1ebe5a] hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
            aria-label="Join our WhatsApp group"
          >
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 fill-white/20" />
            Join our WhatsApp Community
          </a>
        </div>

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
