"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { ImageUpload } from "@/shared/ui/image-upload";
import { createCropLog } from "../actions/create-crop-log";
import { anchorCropLogAction } from "../actions/anchor-crop-log";
import { useAnchorCropLog } from "../hooks/use-anchor-crop-log";

interface CropLogFormProps {
  products?: { id: string; name: string }[];
  campaigns?: { id: string; title: string; campaignPubkey: string | null }[];
}

export function CropLogForm({ products, campaigns }: CropLogFormProps) {
  const t = useTranslations("farming");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<
    "PLANTING" | "GROWING" | "TREATMENT" | "HARVEST" | "OTHER"
  >("PLANTING");
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [crop, setCrop] = useState("");
  const [area, setArea] = useState("");
  const [quantity, setQuantity] = useState("");
  const [method, setMethod] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageHashes, setImageHashes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const {
    anchorCropLog,
    connected,
    loading: anchorLoading,
    error: anchorError,
  } = useAnchorCropLog();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!connected) {
      setError(t("walletRequired"));
      return;
    }

    if (
      !window.confirm(t("anchorConfirm"))
    ) {
      return;
    }

    const data: Record<string, string> = {};
    if (crop) data.crop = crop;
    if (area) data.area = area;
    if (quantity) data.quantity = quantity;
    if (method) data.method = method;
    const orderedImageHashes = images.map((url) => imageHashes[url]);
    if (orderedImageHashes.some((hash) => !hash)) {
      setError(t("imageHashMissing"));
      return;
    }

    startTransition(async () => {
      const result = await createCropLog({
        type,
        description: description.trim(),
        productId: productId || undefined,
        campaignId: campaignId || undefined,
        images,
        imageHashes: orderedImageHashes,
        data: Object.keys(data).length > 0 ? data : undefined,
      });

      if (result.success) {
        const selectedCampaign = campaigns?.find(
          (campaign) => campaign.id === campaignId
        );
        const receipt = await anchorCropLog({
          logId: result.logId,
          contentHash: result.contentHash,
          campaignPubkey: selectedCampaign?.campaignPubkey ?? undefined,
        });

        if (!receipt) {
          setError(t("anchorFailed", { error: anchorError ?? "unknown" }));
          router.refresh();
          return;
        }

        const anchorResult = await anchorCropLogAction({
          logId: result.logId,
          walletAddress: receipt.walletAddress,
          transactionSignature: receipt.signature,
        });
        if (anchorResult.error) {
          setError(anchorResult.error);
          router.refresh();
          return;
        }

        router.refresh();
        setDescription("");
        setCrop("");
        setArea("");
        setQuantity("");
        setMethod("");
        setImages([]);
        setImageHashes({});
        setCampaignId("");
      } else if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
      <div className="space-y-2">
        <Label>{t("typeOther")}</Label>
        <Select
          value={type}
          onValueChange={(v) =>
            setType(
              v as "PLANTING" | "GROWING" | "TREATMENT" | "HARVEST" | "OTHER"
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PLANTING">{t("typePlanting")}</SelectItem>
            <SelectItem value="GROWING">{t("typeGrowing")}</SelectItem>
            <SelectItem value="TREATMENT">{t("typeTreatment")}</SelectItem>
            <SelectItem value="HARVEST">{t("typeHarvest")}</SelectItem>
            <SelectItem value="OTHER">{t("typeOther")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
        />
      </div>

      {products && products.length > 0 && (
        <div className="space-y-2">
          <Label>{t("selectProduct")}</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger>
              <SelectValue placeholder={t("selectProduct")} />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {campaigns && campaigns.length > 0 && (
        <div className="space-y-2">
          <Label>{t("campaignLabel")}</Label>
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger>
              <SelectValue placeholder={t("campaignPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>{t("images")}</Label>
        <ImageUpload
          folder="crop-logs"
          maxFiles={5}
          value={images}
          onChange={setImages}
          onUploaded={(assets) =>
            setImageHashes((current) => ({
              ...current,
              ...Object.fromEntries(
                assets.map((asset) => [asset.url, asset.sha256])
              ),
            }))
          }
          onRemove={(url) =>
            setImageHashes((current) => {
              const next = { ...current };
              delete next[url];
              return next;
            })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="crop">{t("crop")}</Label>
          <Input
            id="crop"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">{t("area")}</Label>
          <Input
            id="area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">{t("quantity")}</Label>
          <Input
            id="quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="method">{t("method")}</Label>
          <Input
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        isLoading={isPending || anchorLoading}
        className="w-full"
      >
        {t("addEntry")}
      </Button>
    </form>
  );
}
