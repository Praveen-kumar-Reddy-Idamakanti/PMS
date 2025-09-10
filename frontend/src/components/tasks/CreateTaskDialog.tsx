import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import taskService, { Task } from '../../services/task.service';
import { userService, User } from '../../services/user.service'; // Import userService and User interface

interface CreateTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
}

const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({ isOpen, onClose, onTaskCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [tags, setTags] = useState(''); // Comma-separated tags
  const [assignedTo, setAssignedTo] = useState<number | null>(null);
  const [assignedBy, setAssignedBy] = useState<number | null>(null);
  const [users, setUsers] = useState<User[]>([]); // State to store fetched users
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await userService.getAllUsers();
        setUsers(fetchedUsers);
        // Optionally set a default assignedBy to the current user if available
        const currentUserData = localStorage.getItem('user');
        if (currentUserData) {
          const currentUser = JSON.parse(currentUserData);
          setAssignedBy(currentUser.id);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users for assignment.');
      }
    };

    if (isOpen) { // Fetch users only when the dialog is open
      fetchUsers();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const newTask: Omit<Task, 'id' | 'tags' | 'subtasks'> = {
        title,
        description,
        dueDate,
        status,
        priority,
        assignedTo: assignedTo || null, // Pass null if not selected
        assignedBy: assignedBy || null, // Pass null if not selected
      };

      const createdTask = await taskService.createTask(newTask);

      // Handle tags separately if needed, or assume backend handles creation/association
      // For now, we'll just pass the tag names as a string and let the backend parse it
      // If the backend expects an array of Tag objects, this needs adjustment.
      // Assuming backend handles tags from a comma-separated string for simplicity.
      if (tags) {
        // This part would ideally involve creating tags if they don't exist
        // and then associating them with the task. For this example, we'll
        // assume the backend processes the 'tags' string from the description or a separate field.
        // Since our task service doesn't have a direct way to add tags during creation
        // (it has addTagToTask which requires a tagId), we'll omit this for now
        // or assume the backend handles it if the 'tags' field is part of the task object.
        // For now, the `Task` interface in `task.service.ts` has `tags?: Tag[];`
        // and `createTask` takes `Omit<Task, 'id' | 'tags' | 'subtasks'>`.
        // This means tags are not directly created with the task via this service method.
        // If tags are to be created/associated, a separate API call or a modified createTask
        // method in the service would be needed.
      }

      onTaskCreated(createdTask);
      onClose();
      // Reset form fields
      setTitle('');
      setDescription('');
      setDueDate('');
      setStatus('todo');
      setPriority('medium');
      setTags('');
      setAssignedTo(null);
      setAssignedBy(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create task.');
      console.error('Error creating task:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dueDate" className="text-right">
              Due Date
            </Label>
            <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select value={status} onValueChange={(value: Task['status']) => setStatus(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priority" className="text-right">
              Priority
            </Label>
            <Select value={priority} onValueChange={(value: Task['priority']) => setPriority(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assignedTo" className="text-right">
              Assigned To
            </Label>
            <Select value={assignedTo !== null ? String(assignedTo) : ''} onValueChange={(value) => setAssignedTo(Number(value))}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assignedBy" className="text-right">
              Assigned By
            </Label>
            <Select value={assignedBy !== null ? String(assignedBy) : ''} onValueChange={(value) => setAssignedBy(Number(value))}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">
              Tags (comma-separated)
            </Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} className="col-span-3" />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
