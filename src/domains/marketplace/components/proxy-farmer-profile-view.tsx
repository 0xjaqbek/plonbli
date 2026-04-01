"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  MapPin,
  Calendar,
  Star,
  Users,
  Phone,
  Mail,
  Handshake,
  Home,
  MessageCircle,
  Sprout,
  Pencil,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { ShareButton } from "@/domains/social/components/share-button";
import type { ProxyFarmerDetail } from "../queries/get-proxy-farmer";

interface ProxyFarmerProfileViewProps {
  profile: ProxyFarmerDetail;
  isCreator: boolean;
  currentUserId: string | null;
}

const contactIcons: Record<string, typeof Phone> = {
  PHONE: Phone,
  EMAIL: Mail,
  IN_PERSON: Handshake,
  PICKUP: Home,
  OTHER: MessageCircle,
};

const methodKeys: Record<string, string> = {
  ECO: "methodEco",
  CONVENTIONAL: "methodConventional",
  OTHER: "methodOther",
};

export function ProxyFarmerProfileView({
  profile,
  isCreator,
  currentUserId,
}: ProxyFarmerProfileViewProps) {
  const t = useTranslations("proxyFarmer");
  const tFarmer = useTranslations("farmer");
  const tRep = useTranslations("reputation");

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Ambassador banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
        <span className="font-medium">{t("title")}</span>
        {" — "}
        {t("createdBy")}{" "}
        <Link
          href={`/social/users/${profile.creator.id}`}
          className="font-medium underline underline-offset-2"
        >
          {profile.creator.name}
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={profile.avatar ?? undefined} />
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold">{profile.name}</h1>
              <Badge variant="outline" className="mt-1 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                {t("ambassadorBadge")}
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isCreator && (
                <Button asChild variant="outline" size="icon">
                  <Link href={`/farmers/proxy/${profile.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <ShareButton entityType="PROXY_FARMER" entityId={profile.id} />
            </div>
          </div>

          {profile.voivodeship && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
              <MapPin className="h-3.5 w-3.5" />
              {profile.voivodeship}
              {profile.county ? `, ${profile.county}` : ""}
              {profile.commune ? `, ${profile.commune}` : ""}
            </p>
          )}

          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="h-3 w-3" />
            {tFarmer("memberSince")}{" "}
            {new Date(profile.createdAt).toLocaleDateString("pl-PL", {
              year: "numeric",
              month: "long",
            })}
          </p>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="flex flex-col items-center p-3 rounded-lg border">
          <Star className="h-5 w-5 text-yellow-500 mb-1" />
          <span className="text-lg font-bold">
            {profile.averageRating > 0
              ? profile.averageRating.toFixed(1)
              : "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            {profile.reviewCount} {tRep("reviewCount")}
          </span>
        </div>

        <div className="flex flex-col items-center p-3 rounded-lg border">
          <Users className="h-5 w-5 text-blue-500 mb-1" />
          <span className="text-lg font-bold">{profile.followerCount}</span>
          <span className="text-xs text-muted-foreground">
            {tFarmer("followers")}
          </span>
        </div>

        <div className="flex flex-col items-center p-3 rounded-lg border">
          <Sprout className="h-5 w-5 text-green-600 mb-1" />
          <span className="text-lg font-bold">
            {profile.products.length}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("products")}
          </span>
        </div>
      </div>

      {/* Contact methods */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("contactMethods")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.contactMethods.map((cm, i) => {
            const Icon = contactIcons[cm.type] ?? MessageCircle;
            return (
              <div key={i} className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {t(`contact${cm.type.charAt(0)}${cm.type.slice(1).toLowerCase()}`)}
                  </p>
                  <p className="text-sm">{cm.value}</p>
                  {cm.note && (
                    <p className="text-xs text-muted-foreground">{cm.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Products */}
      {profile.products.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">{t("products")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile.products.map((product, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{product.name}</p>
                    {product.method && (
                      <Badge
                        variant={product.method === "ECO" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {tFarmer(methodKeys[product.method])}
                      </Badge>
                    )}
                  </div>
                  {product.category && (
                    <Badge variant="outline" className="text-[10px]">
                      {product.category}
                    </Badge>
                  )}
                  {product.description && (
                    <p className="text-sm text-muted-foreground">
                      {product.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Message creator CTA */}
      {currentUserId && !isCreator && (
        <Button asChild className="w-full">
          <Link href={`/messages?to=${profile.creator.id}&proxyFarmerId=${profile.id}`}>
            <MessageCircle className="h-4 w-4 mr-2" />
            {t("messageCreator")}
          </Link>
        </Button>
      )}
    </div>
  );
}
