import { useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Code, 
  Link, 
  Image, 
  Quote, 
  CheckSquare,
  Minus,
  Strikethrough,
  Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  content: string;
  onContentChange: (content: string) => void;
  currentFont: string;
  onFontChange: (font: string) => void;
}

type FormatAction = 
  | 'h1' | 'h2' | 'h3' 
  | 'bold' | 'italic' | 'strikethrough'
  | 'ul' | 'ol' | 'checkbox'
  | 'code' | 'codeblock'
  | 'link' | 'image'
  | 'quote' | 'hr';

const FONTS = [
  { value: 'font-mono', label: 'Monospace' },
  { value: 'font-sans', label: 'Sans Serif' },
  { value: 'font-serif', label: 'Serif' },
];

export function MarkdownToolbar({ 
  textareaRef, 
  content, 
  onContentChange, 
  currentFont, 
  onFontChange 
}: MarkdownToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertFormat = (action: FormatAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let before = content.substring(0, start);
    let after = content.substring(end);
    let newText = '';
    let newCursorStart = start;
    let newCursorEnd = start;

    // Check if we're at the start of a line
    const lineStart = before.lastIndexOf('\n') + 1;
    const isLineStart = start === lineStart || before.endsWith('\n') || before === '';

    switch (action) {
      case 'h1':
        if (selectedText) {
          // Wrap selected text
          if (isLineStart) {
            newText = `# ${selectedText}`;
            newCursorStart = start + 2;
            newCursorEnd = start + 2 + selectedText.length;
          } else {
            newText = `\n# ${selectedText}`;
            newCursorStart = start + 3;
            newCursorEnd = start + 3 + selectedText.length;
          }
        } else {
          newText = isLineStart ? '# ' : '\n# ';
          newCursorStart = newCursorEnd = start + newText.length;
        }
        break;
      case 'h2':
        if (selectedText) {
          if (isLineStart) {
            newText = `## ${selectedText}`;
            newCursorStart = start + 3;
            newCursorEnd = start + 3 + selectedText.length;
          } else {
            newText = `\n## ${selectedText}`;
            newCursorStart = start + 4;
            newCursorEnd = start + 4 + selectedText.length;
          }
        } else {
          newText = isLineStart ? '## ' : '\n## ';
          newCursorStart = newCursorEnd = start + newText.length;
        }
        break;
      case 'h3':
        if (selectedText) {
          if (isLineStart) {
            newText = `### ${selectedText}`;
            newCursorStart = start + 4;
            newCursorEnd = start + 4 + selectedText.length;
          } else {
            newText = `\n### ${selectedText}`;
            newCursorStart = start + 5;
            newCursorEnd = start + 5 + selectedText.length;
          }
        } else {
          newText = isLineStart ? '### ' : '\n### ';
          newCursorStart = newCursorEnd = start + newText.length;
        }
        break;
      case 'bold':
        if (selectedText) {
          newText = `**${selectedText}**`;
          newCursorStart = start + 2;
          newCursorEnd = start + 2 + selectedText.length;
        } else {
          newText = '**bold**';
          newCursorStart = start + 2;
          newCursorEnd = start + 6;
        }
        break;
      case 'italic':
        if (selectedText) {
          newText = `*${selectedText}*`;
          newCursorStart = start + 1;
          newCursorEnd = start + 1 + selectedText.length;
        } else {
          newText = '*italic*';
          newCursorStart = start + 1;
          newCursorEnd = start + 7;
        }
        break;
      case 'strikethrough':
        if (selectedText) {
          newText = `~~${selectedText}~~`;
          newCursorStart = start + 2;
          newCursorEnd = start + 2 + selectedText.length;
        } else {
          newText = '~~strikethrough~~';
          newCursorStart = start + 2;
          newCursorEnd = start + 15;
        }
        break;
      case 'ul':
        if (isLineStart) {
          newText = `- ${selectedText}`;
          newCursorStart = newCursorEnd = start + 2 + selectedText.length;
        } else {
          newText = `\n- ${selectedText}`;
          newCursorStart = newCursorEnd = start + 3 + selectedText.length;
        }
        break;
      case 'ol':
        if (isLineStart) {
          newText = `1. ${selectedText}`;
          newCursorStart = newCursorEnd = start + 3 + selectedText.length;
        } else {
          newText = `\n1. ${selectedText}`;
          newCursorStart = newCursorEnd = start + 4 + selectedText.length;
        }
        break;
      case 'checkbox':
        if (isLineStart) {
          newText = `- [ ] ${selectedText}`;
          newCursorStart = newCursorEnd = start + 6 + selectedText.length;
        } else {
          newText = `\n- [ ] ${selectedText}`;
          newCursorStart = newCursorEnd = start + 7 + selectedText.length;
        }
        break;
      case 'code':
        if (selectedText) {
          newText = `\`${selectedText}\``;
          newCursorStart = start + 1;
          newCursorEnd = start + 1 + selectedText.length;
        } else {
          newText = '`code`';
          newCursorStart = start + 1;
          newCursorEnd = start + 5;
        }
        break;
      case 'codeblock':
        newText = `\n\`\`\`\n${selectedText || 'code here'}\n\`\`\`\n`;
        newCursorStart = start + 5;
        newCursorEnd = start + 5 + (selectedText || 'code here').length;
        break;
      case 'link':
        if (selectedText) {
          newText = `[${selectedText}](url)`;
          newCursorStart = start + selectedText.length + 3;
          newCursorEnd = start + selectedText.length + 6;
        } else {
          newText = '[link text](url)';
          newCursorStart = start + 1;
          newCursorEnd = start + 10;
        }
        break;
      case 'image':
        // Trigger file picker
        fileInputRef.current?.click();
        return;
      case 'quote':
        if (isLineStart) {
          newText = `> ${selectedText}`;
          newCursorStart = newCursorEnd = start + 2 + selectedText.length;
        } else {
          newText = `\n> ${selectedText}`;
          newCursorStart = newCursorEnd = start + 3 + selectedText.length;
        }
        break;
      case 'hr':
        newText = isLineStart ? '---\n' : '\n---\n';
        newCursorStart = newCursorEnd = start + newText.length;
        break;
    }

    const newContent = before + newText + after;
    onContentChange(newContent);

    // Set cursor position after React updates
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    // Create a local URL for the image
    const imageUrl = URL.createObjectURL(file);
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    
    const imageMarkdown = `![${fileName}](${imageUrl})`;
    const newContent = before + imageMarkdown + after;
    onContentChange(newContent);

    // Reset file input
    e.target.value = '';

    setTimeout(() => {
      textarea.focus();
      const newPos = start + imageMarkdown.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const tools = [
    { action: 'h1' as FormatAction, icon: Heading1, label: 'Heading 1' },
    { action: 'h2' as FormatAction, icon: Heading2, label: 'Heading 2' },
    { action: 'h3' as FormatAction, icon: Heading3, label: 'Heading 3' },
    { type: 'separator' },
    { action: 'bold' as FormatAction, icon: Bold, label: 'Bold (Ctrl+B)' },
    { action: 'italic' as FormatAction, icon: Italic, label: 'Italic (Ctrl+I)' },
    { action: 'strikethrough' as FormatAction, icon: Strikethrough, label: 'Strikethrough' },
    { type: 'separator' },
    { action: 'ul' as FormatAction, icon: List, label: 'Bullet List' },
    { action: 'ol' as FormatAction, icon: ListOrdered, label: 'Numbered List' },
    { action: 'checkbox' as FormatAction, icon: CheckSquare, label: 'Checkbox' },
    { type: 'separator' },
    { action: 'code' as FormatAction, icon: Code, label: 'Inline Code' },
    { action: 'quote' as FormatAction, icon: Quote, label: 'Quote' },
    { action: 'hr' as FormatAction, icon: Minus, label: 'Horizontal Rule' },
    { type: 'separator' },
    { action: 'link' as FormatAction, icon: Link, label: 'Link' },
    { action: 'image' as FormatAction, icon: Image, label: 'Insert Image' },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5 flex-wrap p-1 bg-muted/30 rounded-md border mb-2">
        {/* Font Selector */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-muted gap-1"
                >
                  <Type className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">
                    {FONTS.find(f => f.value === currentFont)?.label || 'Font'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Change Font
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            {FONTS.map((font) => (
              <DropdownMenuItem 
                key={font.value} 
                onClick={() => onFontChange(font.value)}
                className={currentFont === font.value ? 'bg-accent' : ''}
              >
                <span className={font.value}>{font.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {tools.map((tool, index) => {
          if (tool.type === 'separator') {
            return <Separator key={index} orientation="vertical" className="h-6 mx-1" />;
          }
          
          const Icon = tool.icon!;
          return (
            <Tooltip key={tool.action}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={() => insertFormat(tool.action!)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {tool.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Hidden file input for image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>
    </TooltipProvider>
  );
}
