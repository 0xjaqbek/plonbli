"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { createReview } from "../actions/create-review";

interface ReviewFormProps {
  targetId?: string;
  proxyFarmerId?: string;
  productId?: string;
}

export function ReviewForm({ targetId, proxyFarmerId, productId }: ReviewFormProps) {
  const t = useTranslations("reputation");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [overall, setOverall] = useState(0);
  const [quality, setQuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (overall === 0) return;
    setError("");

    const dimensions: Record<string, number> = {};
    if (quality > 0) dimensions.quality = quality;
    if (communication > 0) dimensions.communication = communication;
    if (punctuality > 0) dimensions.punctuality = punctuality;
    if (accuracy > 0) dimensions.accuracy = accuracy;

    startTransition(async () => {
      const result = await createReview({
        targetId: targetId ?? null,
        proxyFarmerId: proxyFarmerId ?? null,
        productId,
        overall,
        dimensions:
          Object.keys(dimensions).length > 0 ? dimensions : undefined,
        comment: comment.trim() || undefined,
      });

      if (result.success) {
        router.refresh();
        setOverall(0);
        setQuality(0);
        setCommunication(0);
        setPunctuality(0);
        setAccuracy(0);
        setComment("");
      } else if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
      <div className="space-y-2">
        <Label>{t("overall")}</Label>
        <StarRating value={overall} onChange={setOverall} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">{t("quality")}</Label>
          <StarRating value={quality} onChange={setQuality} size="sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("communication")}</Label>
          <StarRating
            value={communication}
            onChange={setCommunication}
            size="sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("punctuality")}</Label>
          <StarRating
            value={punctuality}
            onChange={setPunctuality}
            size="sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("accuracy")}</Label>
          <StarRating value={accuracy} onChange={setAccuracy} size="sm" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="comment">{t("comment")}</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={isPending || overall === 0}
        className="w-full"
      >
        {t("addReview")}
      </Button>
    </form>
  );
}

function StarRating({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md";
}) {
  const iconSize = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className="focus:outline-none"
        >
          <Star
            className={cn(
              iconSize,
              i < value
                ? "text-yellow-500 fill-yellow-500"
                : "text-muted-foreground hover:text-yellow-400"
            )}
          />
        </button>
      ))}
    </div>
  );
}
