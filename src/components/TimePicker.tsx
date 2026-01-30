import { useState, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown, Sun, Sunset, Moon } from 'lucide-react';
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
  showPresets?: boolean;
}

const timePresets = [
  { label: 'Morning', value: '09:00', icon: Sun, description: '9:00 AM' },
  { label: 'Afternoon', value: '14:00', icon: Sun, description: '2:00 PM' },
  { label: 'Evening', value: '18:00', icon: Sunset, description: '6:00 PM' },
  { label: 'Night', value: '21:00', icon: Moon, description: '9:00 PM' },
];

const quickTimeOptions = [
  { label: '8:00 AM', value: '08:00' },
  { label: '10:00 AM', value: '10:00' },
  { label: '12:00 PM', value: '12:00' },
  { label: '3:00 PM', value: '15:00' },
  { label: '5:00 PM', value: '17:00' },
  { label: '8:00 PM', value: '20:00' },
];

export function TimePicker({ value, onChange, className, showPresets = true }: TimePickerProps) {
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

  const selectTime = (timeValue: string) => {
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
          type="button"
          className={cn(
            "justify-start text-left font-normal gap-2",
            className
          )}
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{formatDisplay()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Primary Presets - Morning, Afternoon, Evening, Night */}
          {showPresets && (
            <div className="grid grid-cols-2 gap-3">
              {timePresets.map((preset) => {
                const Icon = preset.icon;
                const isSelected = value === preset.value;
                return (
                  <Button
                    key={preset.value}
                    variant="outline"
                    type="button"
                    className={cn(
                      "h-auto py-3 px-4 flex flex-col items-center gap-1.5 rounded-xl border-2 transition-all",
                      isSelected 
                        ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" 
                        : "hover:border-primary/50 hover:bg-accent"
                    )}
                    onClick={() => selectTime(preset.value)}
                  >
                    <Icon className={cn("h-5 w-5", isSelected ? "text-primary-foreground" : "text-primary")} />
                    <span className="text-sm font-semibold">{preset.label}</span>
                    <span className={cn(
                      "text-xs",
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {preset.description}
                    </span>
                  </Button>
                );
              })}
            </div>
          )}

          {/* Custom Time Spinner */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-3 text-center">Or set custom time</p>
            <div className="flex items-center justify-center gap-4 bg-muted/50 rounded-lg p-3">
              {/* Hours */}
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-8 w-8 rounded-full hover:bg-primary/10"
                  onClick={incrementHours}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <div className="text-2xl font-bold tabular-nums w-10 text-center py-1">
                  {hours.toString().padStart(2, '0')}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-8 w-8 rounded-full hover:bg-primary/10"
                  onClick={decrementHours}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-2xl font-bold text-muted-foreground">:</div>

              {/* Minutes */}
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-8 w-8 rounded-full hover:bg-primary/10"
                  onClick={incrementMinutes}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <div className="text-2xl font-bold tabular-nums w-10 text-center py-1">
                  {minutes.toString().padStart(2, '0')}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-8 w-8 rounded-full hover:bg-primary/10"
                  onClick={decrementMinutes}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Quick time options */}
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">More options</p>
            <div className="flex flex-wrap gap-1.5">
              {quickTimeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  size="sm"
                  type="button"
                  className={cn(
                    "h-7 text-xs rounded-full",
                    value === option.value && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  onClick={() => selectTime(option.value)}
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