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
  Strikethrough
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  content: string;
  onContentChange: (content: string) => void;
}

type FormatAction = 
  | 'h1' | 'h2' | 'h3' 
  | 'bold' | 'italic' | 'strikethrough'
  | 'ul' | 'ol' | 'checkbox'
  | 'code' | 'codeblock'
  | 'link' | 'image'
  | 'quote' | 'hr';

export function MarkdownToolbar({ textareaRef, content, onContentChange }: MarkdownToolbarProps) {
  const insertFormat = (action: FormatAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let before = content.substring(0, start);
    let after = content.substring(end);
    let newText = '';
    let cursorOffset = 0;

    // Check if we're at the start of a line
    const lineStart = before.lastIndexOf('\n') + 1;
    const isLineStart = start === lineStart || before.endsWith('\n') || before === '';

    switch (action) {
      case 'h1':
        if (isLineStart) {
          newText = `# ${selectedText}`;
          cursorOffset = selectedText ? selectedText.length + 2 : 2;
        } else {
          newText = `\n# ${selectedText}`;
          cursorOffset = selectedText ? selectedText.length + 3 : 3;
        }
        break;
      case 'h2':
        if (isLineStart) {
          newText = `## ${selectedText}`;
          cursorOffset = selectedText ? selectedText.length + 3 : 3;
        } else {
          newText = `\n## ${selectedText}`;
          cursorOffset = selectedText ? selectedText.length + 4 : 4;
        }
        break;
      case 'h3':
        if (isLineStart) {
          newText = `### ${selectedText}`;
          cursorOffset = selectedText ? selectedText.length + 4 : 4;
        } else {
          newText = `\n### ${selectedText}`;
          cursorOffset = selectedText ? selectedText.length + 5 : 5;
        }
        break;
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        cursorOffset = selectedText ? selectedText.length + 4 : 2;
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        cursorOffset = selectedText ? selectedText.length + 2 : 1;
        break;
      case 'strikethrough':
        newText = `~~${selectedText || 'strikethrough'}~~`;
        cursorOffset = selectedText ? selectedText.length + 4 : 2;
        break;
      case 'ul':
        if (isLineStart) {
          newText = `- ${selectedText}`;
          cursorOffset = selectedText ? selectedText.length + 2 : 2;
        } else {
          newText = `\n- ${selectedText}`;
          cursorOffset = selectedText ? selectedText.length + 3 : 3;
        }
        break;
      case 'ol':
        if (isLineStart) {
          newText = `1. ${selectedText}`;
          cursorOffset = selectedText ? selectedText.length + 3 : 3;
        } else {
          newText = `\n1. ${selectedText}`;
          cursorOffset = selectedText ? selectedText.length + 4 : 4;
        }
        break;
      case 'checkbox':
        if (isLineStart) {
          newText = `- [ ] ${selectedText}`;
          cursorOffset = selectedText ? selectedText.length + 6 : 6;
        } else {
          newText = `\n- [ ] ${selectedText}`;
          cursorOffset = selectedText ? selectedText.length + 7 : 7;
        }
        break;
      case 'code':
        newText = `\`${selectedText || 'code'}\``;
        cursorOffset = selectedText ? selectedText.length + 2 : 1;
        break;
      case 'codeblock':
        newText = `\n\`\`\`\n${selectedText || 'code here'}\n\`\`\`\n`;
        cursorOffset = selectedText ? selectedText.length + 5 : 4;
        break;
      case 'link':
        if (selectedText) {
          newText = `[${selectedText}](url)`;
          cursorOffset = selectedText.length + 3;
        } else {
          newText = `[link text](url)`;
          cursorOffset = 1;
        }
        break;
      case 'image':
        newText = `![${selectedText || 'alt text'}](image-url)`;
        cursorOffset = selectedText ? selectedText.length + 14 : 2;
        break;
      case 'quote':
        if (isLineStart) {
          newText = `> ${selectedText}`;
          cursorOffset = selectedText ? selectedText.length + 2 : 2;
        } else {
          newText = `\n> ${selectedText}`;
          cursorOffset = selectedText ? selectedText.length + 3 : 3;
        }
        break;
      case 'hr':
        newText = isLineStart ? '---\n' : '\n---\n';
        cursorOffset = newText.length;
        break;
    }

    const newContent = before + newText + after;
    onContentChange(newContent);

    // Set cursor position after React updates
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + cursorOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const tools = [
    { action: 'h1' as FormatAction, icon: Heading1, label: 'Heading 1', shortcut: '' },
    { action: 'h2' as FormatAction, icon: Heading2, label: 'Heading 2', shortcut: '' },
    { action: 'h3' as FormatAction, icon: Heading3, label: 'Heading 3', shortcut: '' },
    { type: 'separator' },
    { action: 'bold' as FormatAction, icon: Bold, label: 'Bold', shortcut: 'Ctrl+B' },
    { action: 'italic' as FormatAction, icon: Italic, label: 'Italic', shortcut: 'Ctrl+I' },
    { action: 'strikethrough' as FormatAction, icon: Strikethrough, label: 'Strikethrough', shortcut: '' },
    { type: 'separator' },
    { action: 'ul' as FormatAction, icon: List, label: 'Bullet List', shortcut: '' },
    { action: 'ol' as FormatAction, icon: ListOrdered, label: 'Numbered List', shortcut: '' },
    { action: 'checkbox' as FormatAction, icon: CheckSquare, label: 'Checkbox', shortcut: '' },
    { type: 'separator' },
    { action: 'code' as FormatAction, icon: Code, label: 'Inline Code', shortcut: '' },
    { action: 'quote' as FormatAction, icon: Quote, label: 'Quote', shortcut: '' },
    { action: 'hr' as FormatAction, icon: Minus, label: 'Horizontal Rule', shortcut: '' },
    { type: 'separator' },
    { action: 'link' as FormatAction, icon: Link, label: 'Link', shortcut: '' },
    { action: 'image' as FormatAction, icon: Image, label: 'Image', shortcut: '' },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5 flex-wrap p-1 bg-muted/30 rounded-md border mb-2">
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
                {tool.shortcut && <span className="ml-2 text-muted-foreground">{tool.shortcut}</span>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
