import { getTranslations } from "next-intl/server";

export default async function TermsOfServicePage() {
  const t = await getTranslations("legal");

  return (
    <article className="prose prose-sm dark:prose-invert max-w-none">
      <h1>{t("termsOfService")}</h1>
      <p className="text-muted-foreground">{t("lastUpdated")}: 2026-03-30</p>

      <h2>{t("terms.platformCharacter.title")}</h2>
      <p>{t("terms.platformCharacter.body")}</p>

      <h2>{t("terms.general.title")}</h2>
      <p>{t("terms.general.body")}</p>

      <h2>{t("terms.accounts.title")}</h2>
      <p>{t("terms.accounts.body")}</p>

      <h2>{t("terms.roles.title")}</h2>
      <p>{t("terms.roles.body")}</p>

      <h2>{t("terms.content.title")}</h2>
      <p>{t("terms.content.body")}</p>

      <h2>{t("terms.transactions.title")}</h2>
      <p>{t("terms.transactions.body")}</p>

      <h2>{t("terms.prohibited.title")}</h2>
      <p>{t("terms.prohibited.body")}</p>
      <ul>
        <li>{t("terms.prohibited.item1")}</li>
        <li>{t("terms.prohibited.item2")}</li>
        <li>{t("terms.prohibited.item3")}</li>
        <li>{t("terms.prohibited.item4")}</li>
        <li>{t("terms.prohibited.item5")}</li>
      </ul>

      <h2>{t("terms.liability.title")}</h2>
      <p>{t("terms.liability.body")}</p>

      <h2>{t("terms.termination.title")}</h2>
      <p>{t("terms.termination.body")}</p>

      <h2>{t("terms.changes.title")}</h2>
      <p>{t("terms.changes.body")}</p>

      <h2>{t("terms.ranking.title")}</h2>
      <p>{t("terms.ranking.body")}</p>

      <h2>{t("terms.dsa.title")}</h2>
      <p>{t("terms.dsa.body")}</p>
      <h3>{t("terms.dsa.reportTitle")}</h3>
      <p>{t("terms.dsa.reportBody")}</p>
      <h3>{t("terms.dsa.procedureTitle")}</h3>
      <p>{t("terms.dsa.procedureBody")}</p>

      <h2>{t("terms.contact.title")}</h2>
      <p>{t("terms.contact.body")}</p>
    </article>
  );
}
