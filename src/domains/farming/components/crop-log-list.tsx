import { useTranslations } from "next-intl";
import { CropLogCard } from "./crop-log-card";
import type { FarmerCropLog } from "../queries/get-crop-logs";
import type { CropLogCommentView } from "../queries/get-crop-log-comments";

interface CropLogListProps {
  entries: FarmerCropLog[];
  comments?: CropLogCommentView[];
  canComment?: boolean;
}

export function CropLogList({
  entries,
  comments = [],
  canComment = false,
}: CropLogListProps) {
  const t = useTranslations("farming");
  const commentsByEntry = new Map<string, CropLogCommentView[]>();
  for (const comment of comments) {
    const group = commentsByEntry.get(comment.cropLogId) ?? [];
    group.push(comment);
    commentsByEntry.set(comment.cropLogId, group);
  }

  if (entries.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {t("noEntries")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <CropLogCard
          key={entry.id}
          entry={entry}
          comments={commentsByEntry.get(entry.id) ?? []}
          canComment={canComment}
        />
      ))}
    </div>
  );
}
