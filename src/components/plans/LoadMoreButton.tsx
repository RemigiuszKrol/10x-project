import { Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoadMoreButtonProps {
  onLoadMore: () => void;
  isLoading: boolean;
}

/**
 * Przycisk umożliwiający załadowanie kolejnej strony planów (cursor-based pagination)
 */
export function LoadMoreButton({ onLoadMore, isLoading }: LoadMoreButtonProps) {
  return (
    <div className="flex justify-center mt-8">
      <Button
        onClick={onLoadMore}
        variant="outline"
        disabled={isLoading}
        size="lg"
        className="border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Ładowanie...
          </>
        ) : (
          <>
            <ChevronDown className="mr-2 h-4 w-4" />
            Załaduj więcej
          </>
        )}
      </Button>
    </div>
  );
}
