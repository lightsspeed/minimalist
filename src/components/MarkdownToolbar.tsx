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

  const wrapSelection = (prefix: string, suffix: string, placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToWrap = selectedText || placeholder;
    
    const before = content.substring(0, start);
    const after = content.substring(end);
    
    const newContent = before + prefix + textToWrap + suffix + after;
    onContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        // Keep the wrapped text selected
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
      } else {
        // Select the placeholder
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length);
      }
    }, 10);
  };

  const insertLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);

    // Check if we're at the start of a line
    const lastNewline = before.lastIndexOf('\n');
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const isAtLineStart = start === lineStart;
    
    let newContent: string;
    let cursorPos: number;

    if (isAtLineStart || before === '' || before.endsWith('\n')) {
      // At line start, just add prefix
      newContent = before + prefix + selectedText + after;
      cursorPos = start + prefix.length + selectedText.length;
    } else {
      // Mid-line, add newline first
      newContent = before + '\n' + prefix + selectedText + after;
      cursorPos = start + 1 + prefix.length + selectedText.length;
    }

    onContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 10);
  };

  const handleBold = () => wrapSelection('**', '**', 'bold text');
  const handleItalic = () => wrapSelection('*', '*', 'italic text');
  const handleStrikethrough = () => wrapSelection('~~', '~~', 'strikethrough');
  const handleCode = () => wrapSelection('`', '`', 'code');
  
  const handleH1 = () => insertLinePrefix('# ');
  const handleH2 = () => insertLinePrefix('## ');
  const handleH3 = () => insertLinePrefix('### ');
  const handleBulletList = () => insertLinePrefix('- ');
  const handleNumberedList = () => insertLinePrefix('1. ');
  const handleCheckbox = () => insertLinePrefix('- [ ] ');
  const handleQuote = () => insertLinePrefix('> ');

  const handleHorizontalRule = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const before = content.substring(0, start);
    const after = content.substring(start);

    const needsNewlineBefore = before.length > 0 && !before.endsWith('\n');
    const insertion = (needsNewlineBefore ? '\n' : '') + '---\n';
    
    const newContent = before + insertion + after;
    onContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + insertion.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  const handleLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);

    if (selectedText) {
      const newContent = before + '[' + selectedText + '](url)' + after;
      onContentChange(newContent);
      setTimeout(() => {
        textarea.focus();
        // Select "url" for easy replacement
        const urlStart = start + selectedText.length + 3;
        textarea.setSelectionRange(urlStart, urlStart + 3);
      }, 10);
    } else {
      const newContent = before + '[link text](url)' + after;
      onContentChange(newContent);
      setTimeout(() => {
        textarea.focus();
        // Select "link text" for easy replacement
        textarea.setSelectionRange(start + 1, start + 10);
      }, 10);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
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
    const before = content.substring(0, start);
    const after = content.substring(start);
    
    const imageMarkdown = `![${fileName}](${imageUrl})`;
    const newContent = before + imageMarkdown + after;
    onContentChange(newContent);

    // Reset file input
    e.target.value = '';

    setTimeout(() => {
      textarea.focus();
      const newPos = start + imageMarkdown.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  const tools = [
    { action: handleH1, icon: Heading1, label: 'Heading 1' },
    { action: handleH2, icon: Heading2, label: 'Heading 2' },
    { action: handleH3, icon: Heading3, label: 'Heading 3' },
    { type: 'separator' },
    { action: handleBold, icon: Bold, label: 'Bold' },
    { action: handleItalic, icon: Italic, label: 'Italic' },
    { action: handleStrikethrough, icon: Strikethrough, label: 'Strikethrough' },
    { type: 'separator' },
    { action: handleBulletList, icon: List, label: 'Bullet List' },
    { action: handleNumberedList, icon: ListOrdered, label: 'Numbered List' },
    { action: handleCheckbox, icon: CheckSquare, label: 'Checkbox' },
    { type: 'separator' },
    { action: handleCode, icon: Code, label: 'Inline Code' },
    { action: handleQuote, icon: Quote, label: 'Quote' },
    { action: handleHorizontalRule, icon: Minus, label: 'Horizontal Rule' },
    { type: 'separator' },
    { action: handleLink, icon: Link, label: 'Link' },
    { action: handleImageClick, icon: Image, label: 'Insert Image' },
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
            <Tooltip key={tool.label}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={(e) => {
                    e.preventDefault();
                    tool.action!();
                  }}
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
