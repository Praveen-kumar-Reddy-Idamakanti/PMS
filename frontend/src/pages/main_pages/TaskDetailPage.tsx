import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Added
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import taskService, { Task, Subtask, Tag } from '../../services/task.service';
import { userService, User } from '../../services/user.service';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Edit, ArrowLeft, ChevronUp, ChevronDown, Calendar, AlertTriangle, CheckCircle, XCircle, Plane, Clock, ClipboardList } from 'lucide-react'; // Added ChevronUp, ChevronDown, Calendar, AlertTriangle
import { format } from 'date-fns'; // Added format function
import SubtaskCompletionDescriptionDialog from '@/components/tasks/SubtaskCompletionDescriptionDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext'; // Added
import { useToast } from '@/components/ui/use-toast'; // Added
import { createTaskCalendarEvent } from '../../services/calender.service'; // Added
import CalendarGrid from '@/components/calender/CalendarGrid'; // Added
import DateDetails from '@/components/calender/DateDetails'; // Added
import { fetchMonthlyCalendar, fetchDateDetails, CalendarDay, DateDetail } from '../../services/calender.service'; // Added

const TaskDetailPage: React.FC = () => { // Changed component name and props
  const { taskId } = useParams<{ taskId: string }>(); // Get taskId from URL
  const navigate = useNavigate(); // Initialize navigate hook

  const [task, setTask] = useState<Task | null>(null);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth(); // Initialize useAuth hook
  const { toast } = useToast(); // Initialize useToast hook

  // Subtask states
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskAssignedTo, setNewSubtaskAssignedTo] = useState<number | null>(null);
  const [completionDescriptionInput, setCompletionDescriptionInput] = useState<{ [key: string]: string }>({}); // State to hold completion descriptions
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set()); // New state for collapsible subtasks

  const [isCompletionDescriptionDialogOpen, setIsCompletionDescriptionDialogOpen] = useState(false); // New state
  const [subtaskIdForDescription, setSubtaskIdForDescription] = useState<string | null>(null); // New state
  const [initialCompletionDescription, setInitialCompletionDescription] = useState<string | null>(null); // New state

  // Access control states
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [canModifyTask, setCanModifyTask] = useState<boolean>(false);

  const [usersLoading, setUsersLoading] = useState(true);

  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarRecords, setCalendarRecords] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateDetails, setDateDetails] = useState<DateDetail | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Calendar functions
  const getStatusConfig = (status: CalendarDay["status"] | DateDetail["type"] | string) => {
    switch (status) {
      case "present":
        return { 
          color: "bg-green-100", 
          textColor: "text-green-800", 
          icon: CheckCircle, 
          label: "Present" 
        };
      case "absent":
        return { 
          color: "bg-red-100", 
          textColor: "text-red-800", 
          icon: XCircle, 
          label: "Absent" 
        };
      case "leave":
        return { 
          color: "bg-yellow-100", 
          textColor: "text-yellow-800", 
          icon: Plane, 
          label: "Leave" 
        };
      case "holiday":
        return { 
          color: "bg-purple-100", 
          textColor: "text-purple-800", 
          icon: Clock, 
          label: "Holiday" 
        };
      case "task_due":
        return { 
          color: "bg-blue-100", 
          textColor: "text-blue-800", 
          icon: ClipboardList, 
          label: "Task Due" 
        };
      default:
        return null;
    }
  };

  const handleDateSelect = async (date: Date) => {
    if (!user?.id) return;
    
    setSelectedDate(date);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const details = await fetchDateDetails(parseInt(user.id), dateStr, localStorage.getItem('token') || '');
      setDateDetails(details);
    } catch (error) {
      console.error("Error fetching date details:", error);
    }
  };

  const fetchCalendarData = async () => {
    if (!user?.id) return;
    
    try {
      const month = format(currentDate, "yyyy-MM");
      const token = localStorage.getItem('token') || '';
      const data = await fetchMonthlyCalendar(parseInt(user.id), month, token);
      setCalendarRecords(data);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    }
  };

  // Fetch users separately to ensure they're always loaded
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await userService.getAllUsers();
        setUsers(fetchedUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Fetch calendar data when component mounts or currentDate changes
  useEffect(() => {
    fetchCalendarData();
  }, [currentDate, user?.id]);

  // Fetch task data
  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) {
        setError('Task ID not provided.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const fetchedTask = await taskService.getTaskById(taskId);
        setTask(fetchedTask);
        setEditedTask(fetchedTask);
        console.log("Fetched Task Object:", fetchedTask);
      } catch (err: any) {
        console.error('Error fetching task:', err);
        setError(err.message || 'Failed to load task details.');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]); // Only re-run when taskId changes

  // Helpers to read current user id safely
  const getCurrentUserIdFromStorage = (): number | null => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return null;
      const parsed = JSON.parse(userData);
      const id = parsed?.id;
      const num = typeof id === 'number' ? id : (id != null ? Number(id) : null);
      return Number.isFinite(num as number) ? (num as number) : null;
    } catch {
      return null;
    }
  };

  // Check if current user can modify a specific subtask
  const canModifySubtask = (subtask: Subtask): boolean => {
    if (!currentUserId) return false;
    
    // Convert all IDs to numbers for comparison to handle string/number mismatches
    const currentUserNumId = Number(currentUserId);
    const subtaskAssignedTo = subtask.assignedTo ? Number(subtask.assignedTo) : null;
    const subtaskAssignedBy = subtask.assignedBy ? Number(subtask.assignedBy) : null;
    const taskAssignedBy = task?.assignedBy ? Number(task.assignedBy) : null;
    
    // User can modify if they are:
    // 1. The assignee of the subtask
    // 2. The assigner of the subtask
    // 3. The assigner of the main task
    const isSubtaskAssignee = subtaskAssignedTo === currentUserNumId;
    const isSubtaskAssigner = subtaskAssignedBy === currentUserNumId;
    const isTaskAssigner = taskAssignedBy === currentUserNumId;
    
    // Log for debugging
    console.log('Permission check:', {
      currentUserNumId,
      subtaskAssignedTo,
      subtaskAssignedBy,
      taskAssignedBy,
      isSubtaskAssignee,
      isSubtaskAssigner,
      isTaskAssigner
    });
    
    // Allow subtask assignee, subtask assigner, or task assigner to modify
    return isSubtaskAssignee || isSubtaskAssigner || isTaskAssigner;
  };

  // Load current user id once on mount
  useEffect(() => {
    setCurrentUserId(getCurrentUserIdFromStorage());
  }, []);

  // Recompute permission whenever task or current user changes
  useEffect(() => {
    if (!task || currentUserId == null) {
      setCanModifyTask(false);
      return;
    }
    const assignedToId = task.assignedTo != null ? Number(task.assignedTo) : NaN;
    const assignedById = task.assignedBy != null ? Number(task.assignedBy) : NaN;
    setCanModifyTask(assignedToId === currentUserId || assignedById === currentUserId);
  }, [task, currentUserId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setEditedTask(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setEditedTask(prev => ({ ...prev, [id]: value }));
  };

  const handleAssignedUserChange = (id: string, value: string) => {
    setEditedTask(prev => ({ ...prev, [id]: Number(value) }));
  };

  const handleSave = async () => {
    if (!taskId || !canModifyTask) return;

    setLoading(true);
    setError(null);
    try {
      await taskService.updateTask(taskId, editedTask);
      // No onTaskUpdated call, as this is a page
      setIsEditing(false);
      // Re-fetch task to ensure UI is updated with latest data from backend
      const updatedFetchedTask = await taskService.getTaskById(taskId);
      setTask(updatedFetchedTask);
      setEditedTask(updatedFetchedTask);
    } catch (err: any) {
      console.error('Error updating task:', err);
      setError(err.message || 'Failed to update task.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId || !canModifyTask) return;
    
    setIsDeleting(true);
    setError(null);
    try {
      await taskService.deleteTask(taskId);
      setShowDeleteDialog(false);
      navigate('/tasks'); // Navigate back to tasks list after deletion
    } catch (err: any) {
      console.error('Error deleting task:', err);
      setError(err.message || 'Failed to delete task.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Subtask Handlers
  const handleAddSubtask = async () => {
    if (!canModifyTask) return;
    if (!taskId || !newSubtaskTitle.trim()) return;

    setLoading(true);
    setError(null);
    
    // Get current user info
    const currentUserData = localStorage.getItem('user');
    const currentUser = currentUserData ? JSON.parse(currentUserData) : null;
    
    try {
      const newSubtask = await taskService.createSubtask(taskId, {
        title: newSubtaskTitle,
        completed: false,
        assignedTo: newSubtaskAssignedTo || undefined // Pass if selected
      });
      setTask(prev => prev ? { ...prev, subtasks: [...(prev.subtasks || []), newSubtask] } : null);
      setEditedTask(prev => prev ? { ...prev, subtasks: [...(prev.subtasks || []), newSubtask] } : null); // Update editedTask
      setNewSubtaskTitle('');
      setNewSubtaskAssignedTo(null); // Reset
    } catch (err: any) {
      console.error('Error creating subtask:', err);
      setError(err.message || 'Failed to add subtask.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubtaskField = async (subtaskId: string, fieldsToUpdate: Partial<Subtask>) => {
    if (!taskId) return;
    
    // Find the subtask to check permissions
    const subtaskToUpdate = task?.subtasks?.find(st => st.id === subtaskId);
    if (!subtaskToUpdate || !canModifySubtask(subtaskToUpdate)) {
      setError('You are not authorized to modify this subtask');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updatedSubtask = await taskService.updateSubtask(taskId, subtaskId, fieldsToUpdate);
      setTask(prev => prev ? {
        ...prev,
        subtasks: prev.subtasks?.map(st => st.id === subtaskId ? updatedSubtask : st)
      } : null);
      setEditedTask(prev => prev ? { // Update editedTask
        ...prev,
        subtasks: prev.subtasks?.map(st => st.id === subtaskId ? updatedSubtask : st)
      } : null);
    } catch (err: any) {
      console.error(`Error updating subtask:`, err);
      setError(err.message || `Failed to update subtask.`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, newCompletedStatus: boolean) => {
    const subtaskToUpdate = task?.subtasks?.find(st => st.id === subtaskId);
    if (!subtaskToUpdate || !canModifySubtask(subtaskToUpdate)) return;

    if (newCompletedStatus && !subtaskToUpdate.completed) { // Only prompt if becoming completed
      setSubtaskIdForDescription(subtaskId);
      setInitialCompletionDescription(subtaskToUpdate.completionDescription || null);
      setIsCompletionDescriptionDialogOpen(true);
    } else if (!newCompletedStatus && subtaskToUpdate.completed) { // If unmarking, clear description and update immediately
      const fieldsToUpdate: Partial<Subtask> = {
        completed: newCompletedStatus,
        completionDescription: null,
      };
      handleUpdateSubtaskField(subtaskId, fieldsToUpdate);
    }
  };

  const handleConfirmCompletionDescription = (description: string | null) => {
    if (!subtaskIdForDescription) return;

    const subtaskToUpdate = task?.subtasks?.find(st => st.id === subtaskIdForDescription);
    if (!subtaskToUpdate) return;

    const fieldsToUpdate: Partial<Subtask> = {
      completed: true, // Confirm completion
      completionDescription: description,
    };
    handleUpdateSubtaskField(subtaskIdForDescription, fieldsToUpdate);

    // Reset state
    setSubtaskIdForDescription(null);
    setInitialCompletionDescription(null);
    setIsCompletionDescriptionDialogOpen(false);
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!taskId) return;
    
    // Find the subtask to check permissions
    const subtaskToUpdate = task?.subtasks?.find(st => st.id === subtaskId);
    if (!subtaskToUpdate || !canModifySubtask(subtaskToUpdate)) {
      setError('You are not authorized to delete this subtask');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this subtask?')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await taskService.deleteSubtask(taskId, subtaskId);
      setTask(prev => prev ? {
        ...prev,
        subtasks: prev.subtasks?.filter(st => st.id !== subtaskId)
      } : null);
      setEditedTask(prev => prev ? { // Update editedTask
        ...prev,
        subtasks: prev.subtasks?.filter(st => st.id !== subtaskId)
      } : null);
    } catch (err: any) {
      console.error('Error deleting subtask:', err);
      setError(err.message || 'Failed to delete subtask.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !task) {
    return (
      <div className="container mx-auto py-8">
        <h2 className="text-2xl font-bold mb-4">Loading Task...</h2>
        <div className="py-4 text-center">Loading task details...</div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="container mx-auto py-8">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <div className="py-4 text-center text-red-500">{error}</div>
        <Button onClick={() => navigate('/tasks')}>Back to Tasks</Button>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto py-8">
        <h2 className="text-2xl font-bold mb-4">Task Not Found</h2>
        <p className="text-muted-foreground">The task you are looking for does not exist or has been deleted.</p>
        <Button onClick={() => navigate('/tasks')} className="mt-4">Back to Tasks</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/tasks')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">{isEditing ? 'Edit Task' : task.title}</h1>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)} 
              disabled={loading || !canModifyTask}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Task</span>
            </Button>
            {isEditing ? (
              <Button onClick={handleSave} disabled={loading || !canModifyTask}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline"
                  onClick={async () => {
                    if (!task || !user || !user.id || !task.dueDate) {
                      toast({
                        title: "Error",
                        description: "Task details or user information missing.",
                        variant: "destructive",
                      });
                      return;
                    }

                    try {
                      const token = localStorage.getItem("token");
                      if (!token) {
                        throw new Error("Authentication token not found");
                      }
                      
                      if (!task || !taskId) {
                        throw new Error("Task information is incomplete");
                      }

                      // Ensure required fields are present
                      const calendarEvent = {
                        taskId: parseInt(taskId),
                        userId: user?.id ? parseInt(user.id) : 0,
                        title: task.title || "Untitled Task",
                        description: task.description || "",
                        dueDate: task.dueDate || new Date().toISOString().split('T')[0] // Default to today if no due date
                      };

                      await createTaskCalendarEvent(calendarEvent, token);
                      
                      toast({
                        title: "Success",
                        description: "Task has been added to your calendar.",
                      });
                    } catch (err: any) {
                      console.error("Error adding task to calendar:", err);
                      toast({
                        title: "Calendar Error",
                        description: err.message || "Failed to add task to calendar. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> Add to Calendar
                </Button>
                <Button 
                  onClick={() => canModifyTask && setIsEditing(true)} 
                  disabled={loading || !canModifyTask}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" /> Edit Task
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto py-8">
        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Title</Label>
            {isEditing ? (
              <Input id="title" value={editedTask.title || ''} onChange={handleInputChange} className="col-span-3" />
            ) : (
              <p className="col-span-3 text-foreground">{task.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            {isEditing ? (
              <Textarea id="description" value={editedTask.description || ''} onChange={handleInputChange} className="col-span-3" />
            ) : (
              <p className="col-span-3 text-muted-foreground">{task.description || 'No description provided.'}</p>
            )}
          </div>

          {/* Due Date */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dueDate" className="text-right">Due Date</Label>
            {isEditing ? (
              <Input id="dueDate" type="date" value={editedTask.dueDate || ''} onChange={handleInputChange} className="col-span-3" />
            ) : (
              <p className="col-span-3 text-foreground">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date.'}</p>
            )}
          </div>

          {/* Status */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">Status</Label>
            {isEditing ? (
              <Select value={editedTask.status || ''} onValueChange={(value: Task['status']) => handleSelectChange('status', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="col-span-3 text-foreground">{task.status}</p>
            )}
          </div>

          {/* Priority */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priority" className="text-right">Priority</Label>
            {isEditing ? (
              <Select value={editedTask.priority || ''} onValueChange={(value: Task['priority']) => handleSelectChange('priority', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="col-span-3 text-foreground">{task.priority}</p>
            )}
          </div>

          {/* Assigned To */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assignedTo" className="text-right">Assigned To</Label>
            {isEditing ? (
              <Select value={editedTask.assignedTo !== null ? String(editedTask.assignedTo) : ''} onValueChange={(value) => handleAssignedUserChange('assignedTo', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="col-span-3 text-foreground">
                {task.assignedTo ? users.find(u => u.id === task.assignedTo)?.name || 'Unknown User' : 'Unassigned'}
              </p>
            )}
          </div>

          {/* Assigned By */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assignedBy" className="text-right">Assigned By</Label>
            {isEditing ? (
              <Select value={editedTask.assignedBy !== null ? String(editedTask.assignedBy) : ''} onValueChange={(value) => handleAssignedUserChange('assignedBy', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="col-span-3 text-foreground">
                {task.assignedBy ? users.find(u => u.id === task.assignedBy)?.name || 'Unknown User' : 'Unknown'}
              </p>
            )}
          </div>

          {/* Tags (read-only for now, editing would require a more complex component) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">Tags</Label>
            <div className="col-span-3 flex flex-wrap gap-2">
              {task.tags && task.tags.length > 0 ? (
                task.tags.map((tag) => (
                  <span key={tag.id} className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                    {tag.name}
                  </span>
                ))
              ) : (
                <p className="text-muted-foreground">No tags.</p>
              )}
            </div>
          </div>

          {/* Subtasks Section */}
          <div className="col-span-4 border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-2">Subtasks</h3>
            {task.subtasks && task.subtasks.length > 0 ? (
              <div className="space-y-2">
                {task.subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex flex-col p-2 bg-muted/50 rounded-md">
                    <div className="flex items-center justify-between"> {/* Removed cursor-pointer and onClick from here */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={subtask.completed}
                          onCheckedChange={(checked) => {
                            handleToggleSubtask(subtask.id, checked as boolean);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          disabled={!canModifySubtask(subtask)}
                        />
                        <span className={subtask.completed ? 'line-through text-muted-foreground' : 'text-foreground'}>
                          {subtask.title}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Completed By User Icon (only if completed and not editing) */}
                        {subtask.completed && subtask.completedBy && !isEditing && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="ml-2 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold cursor-default">
                                  {users.find(u => u.id === subtask.completedBy)?.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Completed By: {users.find(u => u.id === subtask.completedBy)?.name || 'Unknown User'}</p>
                                {subtask.completedAt && (
                                  <p>Completed At: {new Date(subtask.completedAt).toLocaleString()}</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {isEditing && canModifyTask && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                                onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(subtask.id); }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                                <span className="sr-only">Delete subtask</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete subtask</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {/* Make the icon itself clickable for expand/collapse */}
                        <Button variant="ghost" size="icon" onClick={() => {
                          setExpandedSubtasks(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(subtask.id)) {
                              newSet.delete(subtask.id);
                            } else {
                              newSet.add(subtask.id);
                            }
                            return newSet;
                          });
                        }}>
                          {expandedSubtasks.has(subtask.id) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {expandedSubtasks.has(subtask.id) && ( // Conditionally render expanded content
                      <>
                        {(subtask.assignedTo || subtask.assignedBy) && (
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1 ml-6">
                            {subtask.assignedTo !== undefined && subtask.assignedTo !== null && (
                              <span>Assigned To: {users.find(u => u.id === subtask.assignedTo)?.name || `User ID: ${subtask.assignedTo}`}</span>
                            )}
                          </div>
                        )}
                        {subtask.completed && (subtask.completedBy || subtask.completedAt || subtask.completionDescription) && (
                          <div className="flex flex-col text-xs text-muted-foreground mt-1 ml-6">
                            {subtask.completedBy && (
                              <span>Completed By: {users.find(u => u.id === subtask.completedBy)?.name || 'Unknown'}</span>
                            )}
                            {subtask.completedAt && (
                              <span>Completed At: {new Date(subtask.completedAt).toLocaleString()}</span>
                            )}
                            {subtask.completionDescription && (
                              <span className="mt-1">Description: {subtask.completionDescription}</span>
                            )}
                          </div>
                        )}
                        {isEditing && canModifyTask && (
                          <div className="grid grid-cols-2 gap-2 mt-2 ml-6">
                            <Select
                              value={subtask.assignedTo !== undefined ? String(subtask.assignedTo) : ''}
                              onValueChange={(value) => handleUpdateSubtaskField(subtask.id, { assignedTo: Number(value) })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Assign To" />
                              </SelectTrigger>
                              <SelectContent>
                                {users.map((user) => (
                                  <SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No subtasks.</p>
            )}
            {isEditing && canModifyTask && (
              <div className="mt-4 space-y-2">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add new subtask title"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-grow"
                  />
                  <Button onClick={handleAddSubtask}><Plus className="w-4 h-4 mr-2" /> Add</Button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Select
                    value={newSubtaskAssignedTo !== null ? String(newSubtaskAssignedTo) : ''}
                    onValueChange={(value) => setNewSubtaskAssignedTo(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign To" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Activity Log / Comments (Placeholder for now) */}
          <div className="col-span-4 border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-2">Activity & Comments</h3>
            <p className="text-muted-foreground">Activity log and comments section coming soon...</p>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}

        <div className="flex justify-between items-center mt-4">
          <Button variant="outline" onClick={() => navigate('/tasks')} disabled={loading}>Cancel</Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Are you sure you want to delete "{task?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between gap-2">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
              className="min-w-24"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Calendar Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Calendar View</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
          </Button>
        </div>
        
        {showCalendar && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar Grid */}
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-foreground">
                  {format(currentDate, 'MMMM yyyy')}
                </h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  >
                    ←
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  >
                    →
                  </Button>
                </div>
              </div>
              <CalendarGrid
                currentDate={currentDate}
                records={calendarRecords}
                selectedDate={selectedDate}
                onSelectDate={handleDateSelect}
                getStatusConfig={getStatusConfig}
              />
            </div>

            {/* Date Details */}
            <div className="bg-card rounded-lg border p-4">
              {selectedDate ? (
                <DateDetails
                  date={selectedDate}
                  details={dateDetails}
                  getStatusConfig={getStatusConfig}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click on a date to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subtask Completion Description Dialog */}
      <SubtaskCompletionDescriptionDialog
        isOpen={isCompletionDescriptionDialogOpen}
        onClose={() => setIsCompletionDescriptionDialogOpen(false)}
        onConfirm={handleConfirmCompletionDescription}
        initialDescription={initialCompletionDescription}
      />
    </div>
  );
};

export default TaskDetailPage;
