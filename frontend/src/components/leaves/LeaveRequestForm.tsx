import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { LeaveType } from '@/types/leave';
import leaveService from '@/services/leave.service';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Switch } from '@/components/ui/switch';

// Form validation schema
const formSchema = z.object({
  leaveTypeId: z.string().min(1, 'Please select a leave type.'),
  startDate: z.any()
    .refine((val) => val instanceof Date && !isNaN(val.getTime()), {
      message: 'Please select a valid start date.'
    }),
  endDate: z.any()
    .refine((val) => !val || (val instanceof Date && !isNaN(val.getTime())), {
      message: 'Please select a valid end date.'
    })
    .optional(),
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters.')
    .max(500, 'Reason must not be longer than 500 characters.'),
});

type LeaveFormValues = z.infer<typeof formSchema>;

export const LeaveRequestForm: React.FC = () => {
  const { toast } = useToast();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSingleDay, setIsSingleDay] = useState(true); // New state for single/multiple day

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leaveTypeId: '',
      reason: '',
    },
  });

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        // First try to fetch from API
        let types = [];
        try {
          const response = await leaveService.getLeaveTypes();
          // Handle both array and { success, data } response formats
          types = Array.isArray(response) ? response : (response.data || []);
        } catch (err) {
          console.warn('Using default leave types due to API error:', err);
          // Fallback to default types if API fails
          types = [
            {
              id: '2',
              name: 'Sick Leave',
              yearly_quota: 6,
              monthly_quota: 0,
              carry_forward_allowed: false,
              max_carry_forward: 0,
              is_active: true
            },
            {
              id: '3',
              name: 'Privilege Leave',
              yearly_quota: 6,
              monthly_quota: 0,
              carry_forward_allowed: true,
              max_carry_forward: 6,
              is_active: true
            },
            {
              id: '4',
              name: 'Casual Leave',
              yearly_quota: 12,
              monthly_quota: 1,
              carry_forward_allowed: false,
              max_carry_forward: 0,
              is_active: true
            }
          ];
        }
        
        setLeaveTypes(types);
      } catch (error) {
        console.error('Failed to process leave types:', error);
        toast({
          title: 'Error',
          description: 'Failed to load leave types. Using default types.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingTypes(false);
      }
    };

    fetchLeaveTypes();
  }, [toast]);

  const onSubmit = async (values: LeaveFormValues) => {
    setIsSubmitting(true);
    try {
      const finalEndDate = isSingleDay ? values.startDate : values.endDate;

      if (!finalEndDate) {
        toast({
          title: 'Validation Error',
          description: 'End date is required for multiple-day leave.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      await leaveService.submitLeaveRequest({
        leaveTypeId: values.leaveTypeId,
        startDate: format(values.startDate, 'yyyy-MM-dd'),
        endDate: format(finalEndDate, 'yyyy-MM-dd'),
        reason: values.reason,
      });
      toast({
        title: 'Success',
        description: 'Leave request submitted successfully!',
      });
      form.reset();
      setIsSingleDay(true); // Reset to single day after submission
    } catch (error: any) {
      console.error('Failed to submit leave request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit leave request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingTypes) {
    return <div className="flex justify-center items-center h-32"><LoadingSpinner /></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="leaveTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leave Type</FormLabel>
              <div className="grid grid-cols-1 gap-2">
                {leaveTypes.map((type) => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <div className="relative flex items-center">
                      <input
                        type="radio"
                        id={`leave-type-${type.id}`}
                        value={type.id}
                        checked={field.value === type.id}
                        onChange={() => field.onChange(type.id.toString())}
                        className="h-5 w-5 appearance-none border-2 border-gray-300 rounded-full checked:border-primary checked:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                      />
                      {field.value === type.id && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full pointer-events-none"></div>
                      )}
                    </div>
                    <label 
                      htmlFor={`leave-type-${type.id}`}
                      className={`text-sm font-medium cursor-pointer transition-colors ${
                        field.value === type.id 
                          ? 'text-primary font-semibold' 
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {type.name}
                    </label>
                  </div>
                ))}
              </div>
              <FormDescription>
                Choose the type of leave you are requesting.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center space-x-2">
          <Switch
            id="single-day-mode"
            checked={isSingleDay}
            onCheckedChange={setIsSingleDay}
          />
          <Label htmlFor="single-day-mode">Single day leave</Label>
        </div>

        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                {isSingleDay ? 'The day of your leave.' : 'The first day of your leave.'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isSingleDay && (
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < (form.watch('startDate') || new Date())
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  The last day of your leave.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Briefly explain your reason for leave..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide a clear and concise reason for your leave request.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <LoadingSpinner /> : 'Submit Request'}
        </Button>
      </form>
    </Form>
  );
};
