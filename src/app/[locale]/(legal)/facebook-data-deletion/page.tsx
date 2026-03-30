import { getTranslations } from "next-intl/server";

export default async function FacebookDataDeletionPage() {
  const t = await getTranslations("legal");

  return (
    <article className="prose prose-sm dark:prose-invert max-w-none">
      <h1>{t("facebookDataDeletion")}</h1>
      <p className="text-muted-foreground">{t("lastUpdated")}: 2026-03-30</p>

      <h2>{t("fbDeletion.intro.title")}</h2>
      <p>{t("fbDeletion.intro.body")}</p>

      <h2>{t("fbDeletion.whatWeStore.title")}</h2>
      <p>{t("fbDeletion.whatWeStore.body")}</p>
      <ul>
        <li>{t("fbDeletion.whatWeStore.item1")}</li>
        <li>{t("fbDeletion.whatWeStore.item2")}</li>
        <li>{t("fbDeletion.whatWeStore.item3")}</li>
      </ul>

      <h2>{t("fbDeletion.howToDelete.title")}</h2>
      <p>{t("fbDeletion.howToDelete.body")}</p>
      <ol>
        <li>{t("fbDeletion.howToDelete.step1")}</li>
        <li>{t("fbDeletion.howToDelete.step2")}</li>
        <li>{t("fbDeletion.howToDelete.step3")}</li>
      </ol>

      <h2>{t("fbDeletion.fromFacebook.title")}</h2>
      <p>{t("fbDeletion.fromFacebook.body")}</p>
      <ol>
        <li>{t("fbDeletion.fromFacebook.step1")}</li>
        <li>{t("fbDeletion.fromFacebook.step2")}</li>
        <li>{t("fbDeletion.fromFacebook.step3")}</li>
        <li>{t("fbDeletion.fromFacebook.step4")}</li>
      </ol>

      <h2>{t("fbDeletion.timeline.title")}</h2>
      <p>{t("fbDeletion.timeline.body")}</p>

      <h2>{t("fbDeletion.contact.title")}</h2>
      <p>{t("fbDeletion.contact.body")}</p>
    </article>
  );
}
