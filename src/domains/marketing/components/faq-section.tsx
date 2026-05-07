import { getTranslations } from "next-intl/server";

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
    <section className="py-16 bg-muted/50">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <h2 className="text-3xl font-bold text-center">{t("title")}</h2>
        <div className="space-y-2">
          {items.map(({ q, a }, i) => (
            <details
              key={i}
              className="group rounded-lg border bg-card px-4 py-3 cursor-pointer"
            >
              <summary className="font-medium list-none flex items-center justify-between select-none">
                {q}
                <span className="ml-4 text-muted-foreground transition-transform group-open:rotate-45 flex-shrink-0 text-lg leading-none">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
