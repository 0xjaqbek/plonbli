import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import {
  HeroSection,
  HowItWorksSection,
  ForConsumerSection,
  ForFarmerSection,
  ProxyFarmerSection,
  FeaturesSection,
  AppPreviewSection,
  FaqSection,
} from "@/domains/marketing";

export default async function LandingPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const t = await getTranslations("landing.howItWorks");

  const consumerSteps = [
    { title: t("consumerStep1Title"), desc: t("consumerStep1Desc") },
    { title: t("consumerStep2Title"), desc: t("consumerStep2Desc") },
    { title: t("consumerStep3Title"), desc: t("consumerStep3Desc") },
  ];

  const farmerSteps = [
    { title: t("farmerStep1Title"), desc: t("farmerStep1Desc") },
    { title: t("farmerStep2Title"), desc: t("farmerStep2Desc") },
    { title: t("farmerStep3Title"), desc: t("farmerStep3Desc") },
  ];

  return (
    <>
      <HeroSection isLoggedIn={isLoggedIn} />
      <HowItWorksSection
        title={t("title")}
        tabConsumer={t("tabConsumer")}
        tabFarmer={t("tabFarmer")}
        consumerSteps={consumerSteps}
        farmerSteps={farmerSteps}
      />
      <ForConsumerSection />
      <ForFarmerSection />
      <ProxyFarmerSection isLoggedIn={isLoggedIn} />
      <FeaturesSection />
      <AppPreviewSection />
      <FaqSection />
    </>
  );
}
