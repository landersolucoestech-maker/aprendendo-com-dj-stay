import { Button } from "@/components/ui/button";

interface AffiliatePaginationControlsProps {
  readonly label: string;
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly isFetching: boolean;
  readonly onPageChange: (page: number) => void;
}

export const AffiliatePaginationControls = ({
  label,
  page,
  pageSize,
  total,
  isFetching,
  onPageChange,
}: AffiliatePaginationControlsProps) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page + 1, pageCount);
  const firstItem = total === 0 ? 0 : page * pageSize + 1;
  const lastItem = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {total === 0
          ? `Nenhum ${label}`
          : `${firstItem}–${lastItem} de ${total} ${label}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page === 0 || isFetching}
          onClick={() => onPageChange(Math.max(0, page - 1))}
        >
          Anterior
        </Button>
        <span className="min-w-24 text-center text-xs text-muted-foreground">
          Página {currentPage} de {pageCount}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page + 1 >= pageCount || isFetching}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
};
