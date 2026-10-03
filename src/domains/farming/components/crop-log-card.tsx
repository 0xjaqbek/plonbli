"use client";

import { useTranslations } from "next-intl";
import { ExternalLink, ShieldAlert, ShieldCheck, Sprout } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { ImageLightbox } from "@/shared/ui/image-lightbox";
import { ShareButton } from "@/domains/social/components/share-button";
import type { FarmerCropLog } from "../queries/get-crop-logs";
import { SOLANA_NETWORK } from "@/domains/crowdfunding/lib/constants";
import type { CropLogCommentView } from "../queries/get-crop-log-comments";
import { CropLogComments } from "./crop-log-comments";

interface CropLogCardProps {
  entry: FarmerCropLog;
  comments?: CropLogCommentView[];
  canComment?: boolean;
}

const typeKeys: Record<string, string> = {
  PLANTING: "typePlanting",
  GROWING: "typeGrowing",
  TREATMENT: "typeTreatment",
  HARVEST: "typeHarvest",
  OTHER: "typeOther",
};

export function CropLogCard({
  entry,
  comments = [],
  canComment = false,
}: CropLogCardProps) {
  const t = useTranslations("farming");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-green-600" />
            <CardTitle className="text-sm">{t(typeKeys[entry.type])}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {entry.product?.name && (
              <Badge variant="outline" className="text-[10px]">
                {entry.product.name}
              </Badge>
            )}
            {entry.hashVersion === 1 ? (
              <Badge variant="outline" className="text-[10px] gap-1">
                {t("chainLegacy")}
              </Badge>
            ) : entry.isHashValid ? (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <ShieldCheck className="h-3 w-3" />
                {t("chainValid")}
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px] gap-1">
                <ShieldAlert className="h-3 w-3" />
                {t("chainInvalid")}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm whitespace-pre-wrap">{entry.description}</p>

        {entry.images && entry.images.length > 0 && (
          <ImageLightbox images={entry.images}>
            {(onOpen) => (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 rounded-md overflow-hidden">
                {entry.images.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="w-full aspect-square object-cover cursor-pointer"
                    onClick={() => onOpen(i)}
                  />
                ))}
              </div>
            )}
          </ImageLightbox>
        )}

        {entry.data && (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {entry.data.crop && (
              <span>
                {t("crop")}: {entry.data.crop}
              </span>
            )}
            {entry.data.area && (
              <span>
                {t("area")}: {entry.data.area}
              </span>
            )}
            {entry.data.quantity && (
              <span>
                {t("quantity")}: {entry.data.quantity}
              </span>
            )}
            {entry.data.method && (
              <span>
                {t("method")}: {entry.data.method}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {new Date(entry.createdAt).toLocaleDateString("pl-PL", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <ShareButton entityType="CROP_LOG" entityId={entry.id} size="sm" />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-2 text-xs">
          <code className="text-muted-foreground">
            {entry.contentHash.slice(0, 12)}...
          </code>
          {entry.anchorTransactionSignature ? (
            <a
              href={`https://explorer.solana.com/tx/${entry.anchorTransactionSignature}?cluster=${SOLANA_NETWORK}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {t("solanaAnchored")}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              {t("anchorPending")}
            </span>
          )}
        </div>
        <CropLogComments
          cropLogId={entry.id}
          comments={comments}
          canComment={canComment}
        />
      </CardContent>
    </Card>
  );
}
