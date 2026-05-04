import Link from "next/link";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { useTranslations } from "next-intl";
import type { ProxyListingItem } from "../queries/get-proxy-listings";

const METHOD_COLORS: Record<string, string> = {
  ECO: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CONVENTIONAL: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  OTHER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

interface ProxyListingCardProps {
  item: ProxyListingItem;
}

export function ProxyListingCard({ item }: ProxyListingCardProps) {
  const t = useTranslations("marketplace");
  const tp = useTranslations("product");

  return (
    <Link href={`/farmers/proxy/${item.proxyFarmerId}`}>
      <Card className="h-full hover:shadow-md transition-shadow">
        <div className="aspect-[4/3] rounded-t-lg bg-muted flex items-center justify-center">
          <span className="text-4xl text-muted-foreground">🌱</span>
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 flex-wrap">
            {item.productCategory && <span>{item.productCategory}</span>}
            {item.productMethod && METHOD_COLORS[item.productMethod] && (
              <Badge
                variant="secondary"
                className={METHOD_COLORS[item.productMethod]}
              >
                {item.productMethod === "ECO"
                  ? tp("methodEco")
                  : item.productMethod === "CONVENTIONAL"
                  ? tp("methodConventional")
                  : tp("methodOther")}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {t("proxyBadge")}
            </Badge>
          </div>
          <CardTitle className="text-base line-clamp-2">
            {item.productName}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-sm text-muted-foreground italic">
            {t("proxyContactHint")}
          </p>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          <span>
            {item.proxyFarmerName}
            {item.proxyFarmerVoivodeship
              ? ` · ${item.proxyFarmerVoivodeship}`
              : ""}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
