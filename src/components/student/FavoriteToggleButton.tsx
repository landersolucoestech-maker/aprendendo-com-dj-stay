import { Heart, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StudentFavoriteSubjectType } from "@/contracts/student-favorites";
import {
  useStudentFavoriteStatus,
  useToggleStudentFavorite,
} from "@/hooks/useStudentFavorites";
import { cn } from "@/lib/utils";

interface FavoriteToggleButtonProps {
  readonly subjectType: StudentFavoriteSubjectType;
  readonly subjectId: string;
  readonly className?: string;
  readonly compact?: boolean;
}

export const FavoriteToggleButton = ({
  subjectType,
  subjectId,
  className,
  compact = false,
}: FavoriteToggleButtonProps) => {
  const statusQuery = useStudentFavoriteStatus(subjectType, subjectId);
  const toggleFavorite = useToggleStudentFavorite();
  const isFavorite = statusQuery.data ?? false;
  const isBusy = statusQuery.isLoading || toggleFavorite.isPending;

  return (
    <Button
      type="button"
      variant={isFavorite ? "secondary" : "outline"}
      size={compact ? "icon" : "sm"}
      className={cn(className)}
      disabled={isBusy}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite.mutate({ subjectType, subjectId });
      }}
    >
      {isBusy ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Heart
          className={isFavorite ? "fill-current" : undefined}
          aria-hidden="true"
        />
      )}
      {compact ? null : isFavorite ? "Favoritado" : "Favoritar"}
    </Button>
  );
};
