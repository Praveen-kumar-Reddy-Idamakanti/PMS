import React, { useEffect, useState } from 'react';
import { Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Snackbar, Alert, AlertColor } from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

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
  const { user } = useAuth();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  
  const [formData, setFormData] = useState<{
    name: string;
    date: string;
    type: HolidayType;
  }>({
    name: '',
    date: '',
    type: 'public'
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      console.log('Fetching holidays from:', `${apiUrl}/holidays`);
      
      const response = await fetch(`${apiUrl}/holidays`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch holidays: ${response.status} ${response.statusText}\n${responseText}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed holidays data:', data);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      
      // Ensure we always have an array
      const holidaysArray = Array.isArray(data) ? data : [];
      console.log('Setting holidays:', holidaysArray);
      setHolidays(holidaysArray);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      setSnackbar({ open: true, message: 'Failed to load holidays', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

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
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const url = editingHoliday 
        ? `${apiUrl}/holidays/${editingHoliday.id}`
        : `${apiUrl}/holidays`;
      
      const method = editingHoliday ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save holiday');
      
      setSnackbar({ 
        open: true, 
        message: `Holiday ${editingHoliday ? 'updated' : 'added'} successfully`,
        severity: 'success', 
      });
      
      fetchHolidays();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving holiday:', error);
      setSnackbar({ 
        open: true, 
        message: `Failed to ${editingHoliday ? 'update' : 'add'} holiday`,
        severity: 'error' 
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/holidays/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete holiday');
      }
      
      setSnackbar({ 
        open: true, 
        message: 'Holiday deleted successfully',
        severity: 'success' 
      });
      
      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      setSnackbar({ 
        open: true, 
        message: error instanceof Error ? error.message : 'Failed to delete holiday',
        severity: 'error' 
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Holiday Management</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Holiday
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {holidays.map((holiday) => (
              <TableRow key={holiday.id}>
                <TableCell>{holiday.name}</TableCell>
                <TableCell>{holiday.date ? format(new Date(holiday.date), 'MMM dd, yyyy') : 'Date not set'}</TableCell>
                <TableCell>{holiday.type.charAt(0).toUpperCase() + holiday.type.slice(1)}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(holiday)} color="primary">
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(holiday.id)} color="error">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
          <DialogContent>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Holiday Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Date"
              name="date"
              type="date"
              InputLabelProps={{
                shrink: true,
              }}
              value={formData.date}
              onChange={handleInputChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              select
              label="Type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
            >
              <MenuItem value="public">Public Holiday</MenuItem>
              <MenuItem value="company">Company Holiday</MenuItem>
              <MenuItem value="optional">Optional Holiday</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingHoliday ? 'Update' : 'Add'} Holiday
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export { AdminHolidaysPage };
