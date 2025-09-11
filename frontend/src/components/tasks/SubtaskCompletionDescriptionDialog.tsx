import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SubtaskCompletionDescriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (description: string | null) => void;
  initialDescription?: string | null;
}

const SubtaskCompletionDescriptionDialog: React.FC<SubtaskCompletionDescriptionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialDescription,
}) => {
  const [description, setDescription] = useState(initialDescription || '');

  useEffect(() => {
    setDescription(initialDescription || '');
  }, [initialDescription]);

  const handleConfirm = () => {
    onConfirm(description.trim() === '' ? null : description);
    setDescription(''); // Clear for next use
    onClose();
  };

  const handleCancel = () => {
    onConfirm(null); // Indicate cancellation
    setDescription(''); // Clear for next use
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}> {/* Use handleCancel for outside click/escape */}
      <DialogContent className="sm:max-w-[425px] rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle>Add Completion Description</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="completionDescription">Description (optional)</Label>
          <Textarea
            id="completionDescription"
            placeholder="Enter details about the subtask completion..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubtaskCompletionDescriptionDialog;
