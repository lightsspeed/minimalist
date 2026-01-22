import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(() => {
    const [h] = value.split(':');
    return parseInt(h, 10) || 0;
  });
  const [minutes, setMinutes] = useState(() => {
    const [, m] = value.split(':');
    return parseInt(m, 10) || 0;
  });

  // Sync internal state when external value changes
  useEffect(() => {
    const [h, m] = value.split(':');
    setHours(parseInt(h, 10) || 0);
    setMinutes(parseInt(m, 10) || 0);
  }, [value]);

  const updateTime = (newHours: number, newMinutes: number) => {
    const h = newHours.toString().padStart(2, '0');
    const m = newMinutes.toString().padStart(2, '0');
    onChange(`${h}:${m}`);
  };

  const incrementHours = () => {
    const newHours = hours >= 23 ? 0 : hours + 1;
    setHours(newHours);
    updateTime(newHours, minutes);
  };

  const decrementHours = () => {
    const newHours = hours <= 0 ? 23 : hours - 1;
    setHours(newHours);
    updateTime(newHours, minutes);
  };

  const incrementMinutes = () => {
    const newMinutes = minutes >= 55 ? 0 : minutes + 5;
    const newHours = minutes >= 55 ? (hours >= 23 ? 0 : hours + 1) : hours;
    setMinutes(newMinutes);
    setHours(newHours);
    updateTime(newHours, newMinutes);
  };

  const decrementMinutes = () => {
    const newMinutes = minutes < 5 ? 55 : minutes - 5;
    const newHours = minutes < 5 ? (hours <= 0 ? 23 : hours - 1) : hours;
    setMinutes(newMinutes);
    setHours(newHours);
    updateTime(newHours, newMinutes);
  };

  const formatDisplay = () => {
    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const quickTimeOptions = [
    { label: '9:00 AM', value: '09:00' },
    { label: '12:00 PM', value: '12:00' },
    { label: '3:00 PM', value: '15:00' },
    { label: '6:00 PM', value: '18:00' },
    { label: '9:00 PM', value: '21:00' },
  ];

  const selectQuickTime = (timeValue: string) => {
    const [h, m] = timeValue.split(':');
    setHours(parseInt(h, 10));
    setMinutes(parseInt(m, 10));
    onChange(timeValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal gap-2",
            className
          )}
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{formatDisplay()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Time spinner */}
          <div className="flex items-center justify-center gap-4">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={incrementHours}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="text-3xl font-semibold tabular-nums w-12 text-center py-2">
                {hours.toString().padStart(2, '0')}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={decrementHours}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-3xl font-semibold">:</div>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={incrementMinutes}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="text-3xl font-semibold tabular-nums w-12 text-center py-2">
                {minutes.toString().padStart(2, '0')}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={decrementMinutes}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick options */}
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">Quick select</p>
            <div className="flex flex-wrap gap-1.5">
              {quickTimeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-7 text-xs",
                    value === option.value && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  onClick={() => selectQuickTime(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
