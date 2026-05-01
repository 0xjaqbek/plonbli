import { getTranslations } from "next-intl/server";

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("legal");

  return (
    <article className="prose prose-sm dark:prose-invert max-w-none">
      <h1>{t("privacyPolicy")}</h1>
      <p className="text-muted-foreground">{t("lastUpdated")}: 2026-03-30</p>

      <h2>{t("privacy.intro.title")}</h2>
      <p>{t("privacy.intro.body")}</p>

      <h2>{t("privacy.dataCollected.title")}</h2>
      <p>{t("privacy.dataCollected.body")}</p>
      <ul>
        <li>{t("privacy.dataCollected.item1")}</li>
        <li>{t("privacy.dataCollected.item2")}</li>
        <li>{t("privacy.dataCollected.item3")}</li>
        <li>{t("privacy.dataCollected.item4")}</li>
      </ul>

      <h2>{t("privacy.purpose.title")}</h2>
      <p>{t("privacy.purpose.body")}</p>
      <ul>
        <li>{t("privacy.purpose.item1")}</li>
        <li>{t("privacy.purpose.item2")}</li>
        <li>{t("privacy.purpose.item3")}</li>
        <li>{t("privacy.purpose.item4")}</li>
      </ul>

      <h2>{t("privacy.thirdParty.title")}</h2>
      <p>{t("privacy.thirdParty.body")}</p>

      <h2>{t("privacy.cookies.title")}</h2>
      <p>{t("privacy.cookies.body")}</p>

      <h2>{t("privacy.rights.title")}</h2>
      <p>{t("privacy.rights.body")}</p>
      <ul>
        <li>{t("privacy.rights.item1")}</li>
        <li>{t("privacy.rights.item2")}</li>
        <li>{t("privacy.rights.item3")}</li>
        <li>{t("privacy.rights.item4")}</li>
      </ul>

      <h2>{t("privacy.retention.title")}</h2>
      <p>{t("privacy.retention.body")}</p>

      <h2>{t("privacy.administrator.title")}</h2>
      <p>{t("privacy.administrator.body")}</p>

      <h2>{t("privacy.contact.title")}</h2>
      <p>{t("privacy.contact.body")}</p>
    </article>
  );
}
