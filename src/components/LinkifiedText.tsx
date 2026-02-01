import React from 'react';

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

// Regex to match URLs
const urlRegex = /(https?:\/\/[^\s]+)/g;

export function LinkifiedText({ text, className = '' }: LinkifiedTextProps) {
  const parts = text.split(urlRegex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          // Reset regex lastIndex since we're reusing it
          urlRegex.lastIndex = 0;
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
