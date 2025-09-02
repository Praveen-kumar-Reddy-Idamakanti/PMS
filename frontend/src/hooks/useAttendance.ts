import { useState, useCallback, useEffect } from 'react';
import { attendanceService } from '../services/attendance.service';
import { useToast } from '../components/ui/use-toast';
import { debug } from '../utils/debug';

interface AttendanceState {
  todaysStatus: any | null;
  records: any[];
  summary: any | null;
  loading: boolean;
  error: string | null;
}

export const useAttendance = () => {
  const [state, setState] = useState<AttendanceState>({
    todaysStatus: null,
    records: [],
    summary: null,
    loading: false,
    error: null,
  });
  const { toast } = useToast();

  const setLoading = (loading: boolean) => {
    setState((prev) => ({ ...prev, loading, error: loading ? null : prev.error }));
  };

  const setError = (error: string | null) => {
    setState((prev) => ({ ...prev, error }));
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  };

  const checkIn = useCallback(
    async (data: {
      notes?: string;
      location?: {
        latitude: number;
        longitude: number;
        address: string;
      };
      photo?: string;
    }) => {
      setLoading(true);
      try {
        const result = await attendanceService.checkIn(data);
        await fetchTodaysStatus();
        toast({
          title: 'Success',
          description: 'Checked in successfully',
        });
        return result;
      } catch (error: any) {
        setError(error.message || 'Failed to check in');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const checkOut = useCallback(
    async (data: {
      notes?: string;
      location?: {
        latitude: number;
        longitude: number;
        address: string;
      };
      photo?: string;
    }) => {
      setLoading(true);
      try {
        const result = await attendanceService.checkOut(data);
        await fetchTodaysStatus();
        toast({
          title: 'Success',
          description: 'Checked out successfully',
        });
        return result;
      } catch (error: any) {
        setError(error.message || 'Failed to check out');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const fetchTodaysStatus = useCallback(async () => {
    setLoading(true);
    try {
      // attendanceService.getTodaysStatus returns the full status object directly
      const data = await attendanceService.getTodaysStatus();
      setState((prev) => ({
        ...prev,
        // Store the full status object so UI can access checkInTime/checkOutTime
        todaysStatus: data,
      }));
      return data;
    } catch (error: any) {
      setError(error.message || 'Failed to fetch today\'s status');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAttendanceRecords = useCallback(
    async (params: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
      userId?: number;
    }) => {
      setLoading(true);
      try {
        const { data } = await attendanceService.getAttendanceRecords(params);
        setState((prev) => ({
          ...prev,
          records: data.records,
        }));
        return data;
      } catch (error: any) {
        setError(error.message || 'Failed to fetch attendance records');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchAttendanceSummary = useCallback(
    async (params: { startDate: string; endDate: string; userId?: string }) => {
      setLoading(true);
      try {
        const summary = await attendanceService.getAttendanceSummary(params);
        setState((prev) => ({
          ...prev,
          summary,
        }));
        return summary;
      } catch (error: any) {
        setError(error.message || 'Failed to fetch attendance summary');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    ...state,
    loading: state.loading,
    error: state.error,
    checkIn,
    checkOut,
    fetchTodaysStatus,
    fetchAttendanceRecords,
    fetchAttendanceSummary,
  };
};
