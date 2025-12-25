/**
 * Parse natural language date expressions from text
 * Returns the due date and the cleaned text without the date expression
 */
export function parseDueDate(text: string): { dueDate: Date | null; cleanedText: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Patterns to match - order matters (most specific first)
  const patterns: { regex: RegExp; getDate: () => Date }[] = [
    // "next week", "next monday", etc.
    {
      regex: /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      getDate: () => {
        const match = text.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
        if (!match) return today;
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(match[1].toLowerCase());
        const currentDay = today.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        daysUntil += 7; // "next" means the week after
        const result = new Date(today);
        result.setDate(result.getDate() + daysUntil);
        return result;
      }
    },
    // "this monday", "this friday", etc.
    {
      regex: /\bthis\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      getDate: () => {
        const match = text.match(/\bthis\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
        if (!match) return today;
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(match[1].toLowerCase());
        const currentDay = today.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        const result = new Date(today);
        result.setDate(result.getDate() + daysUntil);
        return result;
      }
    },
    // "on monday", "on friday", etc.
    {
      regex: /\bon\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      getDate: () => {
        const match = text.match(/\bon\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
        if (!match) return today;
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(match[1].toLowerCase());
        const currentDay = today.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        const result = new Date(today);
        result.setDate(result.getDate() + daysUntil);
        return result;
      }
    },
    // "next week"
    {
      regex: /\bnext\s+week\b/i,
      getDate: () => {
        const result = new Date(today);
        result.setDate(result.getDate() + 7);
        return result;
      }
    },
    // "next month"
    {
      regex: /\bnext\s+month\b/i,
      getDate: () => {
        const result = new Date(today);
        result.setMonth(result.getMonth() + 1);
        return result;
      }
    },
    // "in X days"
    {
      regex: /\bin\s+(\d+)\s+days?\b/i,
      getDate: () => {
        const match = text.match(/\bin\s+(\d+)\s+days?\b/i);
        if (!match) return today;
        const days = parseInt(match[1], 10);
        const result = new Date(today);
        result.setDate(result.getDate() + days);
        return result;
      }
    },
    // "in X weeks"
    {
      regex: /\bin\s+(\d+)\s+weeks?\b/i,
      getDate: () => {
        const match = text.match(/\bin\s+(\d+)\s+weeks?\b/i);
        if (!match) return today;
        const weeks = parseInt(match[1], 10);
        const result = new Date(today);
        result.setDate(result.getDate() + weeks * 7);
        return result;
      }
    },
    // "tomorrow"
    {
      regex: /\btomorrow\b/i,
      getDate: () => {
        const result = new Date(today);
        result.setDate(result.getDate() + 1);
        return result;
      }
    },
    // "today"
    {
      regex: /\btoday\b/i,
      getDate: () => new Date(today)
    },
    // "day after tomorrow"
    {
      regex: /\bday\s+after\s+tomorrow\b/i,
      getDate: () => {
        const result = new Date(today);
        result.setDate(result.getDate() + 2);
        return result;
      }
    },
    // "end of week" / "eow"
    {
      regex: /\b(end\s+of\s+week|eow)\b/i,
      getDate: () => {
        const result = new Date(today);
        const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
        result.setDate(result.getDate() + daysUntilFriday);
        return result;
      }
    },
    // "end of month" / "eom"
    {
      regex: /\b(end\s+of\s+month|eom)\b/i,
      getDate: () => {
        const result = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return result;
      }
    },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      const dueDate = pattern.getDate();
      const cleanedText = text.replace(pattern.regex, '').replace(/\s+/g, ' ').trim();
      return { dueDate, cleanedText };
    }
  }

  return { dueDate: null, cleanedText: text };
}
