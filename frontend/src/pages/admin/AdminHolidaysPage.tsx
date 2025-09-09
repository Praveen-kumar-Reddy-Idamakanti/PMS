import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from 'date-fns';
import { Plus, Trash2, Edit, Calendar as CalendarIcon } from 'lucide-react';
import { LoadingGif } from "@/components/ui/LoadingGif";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { holidayService } from "../../services/holiday.service";

type HolidayType = 'public' | 'company' | 'optional';

interface Holiday {
  id: number;
  name: string;
  date: string;
  type: HolidayType;
  created_by: number;
  created_at: string;
  updated_at: string;
}

const AdminHolidaysPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  
  const [formData, setFormData] = useState<{
    name: string;
    date: string;
    type: HolidayType;
  }>({
    name: '',
    date: '',
    type: 'public'
  });

  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
    queryKey: ['holidays'],
    queryFn: async () => {
      const data = await holidayService.getHolidays();
      return Array.isArray(data) ? data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Holiday, 'id' | 'created_at' | 'updated_at'>) => 
      holidayService.createHoliday(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setOpenDialog(false);
      toast({
        title: "Success",
        description: "Holiday created successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error('Error creating holiday:', error);
      toast({
        title: "Error",
        description: "Failed to create holiday",
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: Holiday) => 
      holidayService.updateHoliday(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setOpenDialog(false);
      toast({
        title: "Success",
        description: "Holiday updated successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error('Error updating holiday:', error);
      toast({
        title: "Error",
        description: "Failed to update holiday",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => holidayService.deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast({
        title: "Success",
        description: "Holiday deleted successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error('Error deleting holiday:', error);
      toast({
        title: "Error",
        description: "Failed to delete holiday",
        variant: "destructive",
      });
    }
  });

  const handleOpenDialog = (holiday: Holiday | null = null) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        date: holiday.date.split('T')[0],
        type: holiday.type
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        name: '',
        date: '',
        type: 'public'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingHoliday(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingHoliday) {
      updateMutation.mutate({ ...formData, id: editingHoliday.id } as Holiday);
    } else {
      createMutation.mutate(formData as Omit<Holiday, 'id' | 'created_at' | 'updated_at'>)
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      deleteMutation.mutate(id);
    }
  };


  if (isLoading) {
    return <LoadingGif text="Loading holidays..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Holiday Management</h2>
        <Button 
          onClick={() => {
            setEditingHoliday(null);
            setFormData({ name: '', date: '', type: 'public' });
            setOpenDialog(true);
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Holiday
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.map((holiday) => (
              <TableRow key={holiday.id}>
                <TableCell className="font-medium">{holiday.name}</TableCell>
                <TableCell>
                  {holiday.date ? format(new Date(holiday.date), 'MMM dd, yyyy') : 'N/A'}
                </TableCell>
                <TableCell>
                  <span className="capitalize">{holiday.type}</span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingHoliday(holiday);
                        setFormData({
                          name: holiday.name,
                          date: holiday.date,
                          type: holiday.type
                        });
                        setOpenDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete(holiday.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
            <DialogDescription>
              {editingHoliday ? 'Update the holiday details' : 'Fill in the details for the new holiday'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Holiday Name</label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter holiday name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium">Date</label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">Type</label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({...formData, type: value as HolidayType})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public Holiday</SelectItem>
                  <SelectItem value="company">Company Holiday</SelectItem>
                  <SelectItem value="optional">Optional Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpenDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingHoliday ? 'Update' : 'Add'} Holiday
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { AdminHolidaysPage };
