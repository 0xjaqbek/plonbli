import { getTranslations } from "next-intl/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui/accordion";

export async function FaqSection() {
  const t = await getTranslations("landing.faq");

  const items = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
    { q: t("q5"), a: t("a5") },
    { q: t("q6"), a: t("a6") },
  ];

  return (
    <section className="py-20 bg-landing-wash">
      <div className="max-w-2xl mx-auto px-4 space-y-8">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-center">
          {t("title")}
        </h2>
        <Accordion type="single" collapsible className="space-y-2">
          {items.map(({ q, a }, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-xl border border-border/50 bg-card px-5 shadow-[0_1px_8px_oklch(0.45_0.1_145_/_0.04)]"
            >
              <AccordionTrigger className="font-display font-medium text-left py-4 hover:no-underline">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
