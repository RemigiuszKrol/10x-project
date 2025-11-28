import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface DeletePlanDialogProps {
  open: boolean;
  planName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal dialog potwierdzenia usunięcia planu
 */
export function DeletePlanDialog({ open, planName, isDeleting, onConfirm, onCancel }: DeletePlanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent aria-describedby="delete-dialog-description">
        <DialogHeader>
          <DialogTitle>Usuń plan</DialogTitle>
          <DialogDescription id="delete-dialog-description">
            Czy na pewno chcesz usunąć plan <strong>{planName}</strong>? Wszystkie dane związane z tym planem, w tym
            rośliny i komórki siatki, zostaną trwale usunięte. Tej operacji nie można cofnąć.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Anuluj
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting} aria-busy={isDeleting}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Usuń
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
