import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Sparkles,
  ChevronDown,
  Check,
  Undo2,
  Redo2,
  Type,
  Code,
  Quote,
  Minus,
  Loader2,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Custom TextStyle extension with font size support
const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  maxCharacters?: number;
  className?: string;
  minHeight?: string;
}

const FONT_FAMILIES = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Outfit', value: 'Outfit, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Playfair', value: '"Playfair Display", serif' },
  { label: 'Mono', value: '"JetBrains Mono", monospace' },
  { label: 'System', value: 'system-ui, -apple-system, sans-serif' },
];

const FONT_SIZES = [
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '28px', value: '28px' },
  { label: '32px', value: '32px' },
];

const PALETTE_COLORS = [
  { label: 'Default', value: 'inherit', bg: 'bg-foreground' },
  { label: 'Orange', value: '#f97316', bg: 'bg-orange-500' },
  { label: 'Amber', value: '#f59e0b', bg: 'bg-amber-500' },
  { label: 'Blue', value: '#3b82f6', bg: 'bg-blue-500' },
  { label: 'Indigo', value: '#6366f1', bg: 'bg-indigo-500' },
  { label: 'Purple', value: '#a855f7', bg: 'bg-purple-500' },
  { label: 'Rose', value: '#f43f5e', bg: 'bg-rose-500' },
  { label: 'Emerald', value: '#10b981', bg: 'bg-emerald-500' },
  { label: 'Cyan', value: '#06b6d4', bg: 'bg-cyan-500' },
  { label: 'Slate', value: '#94a3b8', bg: 'bg-slate-400' },
];

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Write your thoughts here...',
  maxCharacters = 1000,
  className,
  minHeight = '520px',
}: RichTextEditorProps) {
  const [currentFont, setCurrentFont] = useState('Inter');
  const [currentSize, setCurrentSize] = useState('16px');
  const [currentColor, setCurrentColor] = useState<string>('inherit');
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);
  const [aiPopoverOpen, setAiPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      CustomTextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Color.configure({
        types: ['textStyle'],
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-4 cursor-pointer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-md max-w-full my-2 border border-border/50',
        },
      }),
      CharacterCount.configure({
        limit: maxCharacters > 0 ? maxCharacters : undefined,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[460px] p-5 text-foreground dark:text-zinc-100 font-normal leading-relaxed',
          className
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  // Keep editor content in sync with external content prop if updated externally
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (content !== currentHtml) {
      if (!content || content.trim() === '') {
        if (currentHtml !== '<p></p>') {
          editor.commands.setContent('', false);
        }
      } else if (content !== currentHtml) {
        if (!editor.isFocused) {
          editor.commands.setContent(content, false);
        }
      }
    }
  }, [content, editor]);

  // Set font family
  const handleSelectFont = (fontItem: typeof FONT_FAMILIES[0]) => {
    setCurrentFont(fontItem.label);
    setFontDropdownOpen(false);
    if (!editor) return;
    editor.chain().focus().setFontFamily(fontItem.value).run();
  };

  // Set font size
  const handleSelectSize = (sizeItem: typeof FONT_SIZES[0]) => {
    setCurrentSize(sizeItem.label);
    setSizeDropdownOpen(false);
    if (!editor) return;
    // @ts-expect-error custom attribute on textStyle
    editor.chain().focus().setMark('textStyle', { fontSize: sizeItem.value }).run();
  };

  // Set color
  const handleSelectColor = (colorValue: string) => {
    setCurrentColor(colorValue);
    setColorPopoverOpen(false);
    if (!editor) return;
    if (colorValue === 'inherit') {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(colorValue).run();
    }
  };

  // Synchronize color mark with active cursor/selection
  useEffect(() => {
    if (!editor) return;
    const updateActiveMarks = () => {
      const activeColor = editor.getAttributes('textStyle')?.color;
      if (activeColor) {
        setCurrentColor(activeColor);
      } else if (!editor.isActive('textStyle')) {
        setCurrentColor('inherit');
      }
    };
    editor.on('selectionUpdate', updateActiveMarks);
    editor.on('transaction', updateActiveMarks);
    return () => {
      editor.off('selectionUpdate', updateActiveMarks);
      editor.off('transaction', updateActiveMarks);
    };
  }, [editor]);

  // Insert Link
  const handleApplyLink = () => {
    if (!editor) return;
    if (linkUrl.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      let finalUrl = linkUrl.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
    }
    setLinkUrl('');
    setLinkPopoverOpen(false);
  };

  // Insert Image
  const handleApplyImage = () => {
    if (!editor || !imageUrl.trim()) return;
    editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    setImageUrl('');
    setImagePopoverOpen(false);
  };

  // AI Assist actions
  const handleAiAction = async (action: 'improve' | 'concise' | 'expand' | 'bullets' | 'fix') => {
    if (!editor) return;
    setIsAiLoading(true);

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    const targetText = selectedText || editor.getText();

    if (!targetText.trim()) {
      toast.error('Please write some text first for AI to assist with.');
      setIsAiLoading(false);
      return;
    }

    try {
      await new Promise((r) => setTimeout(r, 650));
      let transformed = targetText;

      switch (action) {
        case 'improve':
          transformed = targetText
            .replace(/\b(good|nice|fine)\b/gi, 'exceptional')
            .replace(/\b(big)\b/gi, 'substantial')
            .replace(/\b(hard)\b/gi, 'challenging')
            .replace(/\b(bad)\b/gi, 'suboptimal');
          break;
        case 'concise':
          transformed =
            targetText
              .split('.')
              .filter(Boolean)
              .map((s) => s.trim())
              .slice(0, 3)
              .join('. ') + '.';
          break;
        case 'expand':
          transformed = `${targetText}\n\nFurthermore, this initiative aligns with strategic objectives, ensuring continuous refinement and high efficiency throughout the execution timeline.`;
          break;
        case 'bullets':
          const sentences = targetText.split(/[.\n]+/).map((s) => s.trim()).filter((s) => s.length > 5);
          transformed = sentences.map((s) => `• ${s}`).join('\n');
          break;
        case 'fix':
          transformed = targetText
            .replace(/\s+/g, ' ')
            .replace(/([.?!])\s*([a-z])/g, (_, p1, p2) => `${p1} ${p2.toUpperCase()}`)
            .trim();
          break;
      }

      if (selectedText) {
        editor.chain().focus().deleteRange({ from, to }).insertContent(transformed).run();
      } else {
        editor.chain().focus().setContent(`<p>${transformed.replace(/\n/g, '<br/>')}</p>`).run();
      }

      toast.success('AI formatting applied!');
      setAiPopoverOpen(false);
    } catch {
      toast.error('Failed to process AI action');
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!editor) {
    return (
      <div className="h-64 flex items-center justify-center rounded-xl border border-border dark:border-zinc-800 bg-card dark:bg-zinc-950/60 text-muted-foreground text-sm">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Initializing editor...
      </div>
    );
  }

  const charCount = editor.storage.characterCount.characters();
  const charsLeft = maxCharacters > 0 ? maxCharacters - charCount : 0;

  return (
    <div className="w-full flex flex-col space-y-2">
      {/* Top Attached Toolbar - Dual Light & Dark Theme */}
      <div className="flex items-center gap-1.5 flex-wrap p-1.5 bg-muted/40 backdrop-blur-md rounded-xl border border-border shadow-sm text-foreground">
        {/* Font Family Dropdown */}
        <Popover open={fontDropdownOpen} onOpenChange={setFontDropdownOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs font-medium text-foreground hover:bg-background rounded-lg border border-border"
            >
              <Type className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{currentFont}</span>
              <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1 bg-popover border-border text-popover-foreground" align="start">
            <div className="space-y-0.5">
              {FONT_FAMILIES.map((font) => (
                <button
                  key={font.label}
                  type="button"
                  onClick={() => handleSelectFont(font)}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md text-left transition-colors',
                    currentFont === font.label
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                  style={{ fontFamily: font.value }}
                >
                  <span>{font.label}</span>
                  {currentFont === font.label && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Font Size Dropdown */}
        <Popover open={sizeDropdownOpen} onOpenChange={setSizeDropdownOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs font-medium text-foreground hover:bg-background rounded-lg border border-border"
            >
              <span>{currentSize}</span>
              <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-28 p-1 bg-popover border-border text-popover-foreground" align="start">
            <div className="space-y-0.5">
              {FONT_SIZES.map((size) => (
                <button
                  key={size.label}
                  type="button"
                  onClick={() => handleSelectSize(size)}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md text-left transition-colors',
                    currentSize === size.label
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  <span>{size.label}</span>
                  {currentSize === size.label && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-5 w-[1px] bg-border mx-0.5" />

        {/* Bold */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            'h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
            editor.isActive('bold') && 'bg-muted text-foreground font-bold'
          )}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>

        {/* Italic */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            'h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
            editor.isActive('italic') && 'bg-muted text-foreground'
          )}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>

        {/* Underline */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            'h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
            editor.isActive('underline') && 'bg-muted text-foreground'
          )}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        {/* Color Dot Picker */}
        <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted relative group"
              title="Text Color"
            >
              <span
                className={cn(
                  'h-3.5 w-3.5 rounded-full ring-2 ring-border group-hover:ring-primary/40 transition-all flex items-center justify-center',
                  (!currentColor || currentColor === 'inherit') && 'bg-foreground'
                )}
                style={
                  currentColor && currentColor !== 'inherit'
                    ? { backgroundColor: currentColor }
                    : undefined
                }
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2.5 bg-popover border-border shadow-md" align="center">
            <div className="text-[11px] font-medium text-muted-foreground mb-2 px-1">Text Color</div>
            <div className="grid grid-cols-5 gap-2">
              {PALETTE_COLORS.map((col) => {
                const isSelected =
                  (col.value === 'inherit' && (!currentColor || currentColor === 'inherit')) ||
                  currentColor === col.value;

                return (
                  <button
                    key={col.label}
                    type="button"
                    onClick={() => handleSelectColor(col.value)}
                    title={col.label}
                    className={cn(
                      'h-6 w-6 rounded-full flex items-center justify-center transition-all hover:scale-110 border border-border relative',
                      col.bg,
                      isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                    )}
                  >
                    {isSelected && (
                      <Check
                        className={cn(
                          'h-3 w-3',
                          col.value === 'inherit' ? 'text-background' : 'text-white'
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-5 w-[1px] bg-border dark:bg-zinc-800 mx-0.5" />

        {/* Align Left */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={cn(
            'h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted',
            editor.isActive({ textAlign: 'left' }) && 'bg-muted text-foreground'
          )}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>

        {/* Align Center */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={cn(
            'h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted',
            editor.isActive({ textAlign: 'center' }) && 'bg-muted text-foreground'
          )}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>

        {/* Align Right */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={cn(
            'h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted',
            editor.isActive({ textAlign: 'right' }) && 'bg-muted text-foreground'
          )}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        {/* Bullet List */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            'h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted',
            editor.isActive('bulletList') && 'bg-muted text-foreground'
          )}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>

        {/* Numbered List */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            'h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted',
            editor.isActive('orderedList') && 'bg-muted text-foreground'
          )}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="h-5 w-[1px] bg-border dark:bg-zinc-800 mx-0.5" />

        {/* Link */}
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted',
                editor.isActive('link') && 'bg-muted text-primary'
              )}
              title="Insert Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 bg-popover border-border text-popover-foreground" align="start">
            <div className="space-y-2">
              <div className="text-xs font-medium text-foreground">Insert Link</div>
              <Input
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyLink()}
                className="h-8 text-xs bg-background border-input"
              />
              <div className="flex justify-end gap-1.5 pt-1">
                {editor.isActive('link') && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      editor.chain().focus().unsetLink().run();
                      setLinkPopoverOpen(false);
                    }}
                    className="h-7 text-xs text-rose-500 dark:text-rose-400 hover:bg-rose-500/10"
                  >
                    Remove
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyLink}
                  className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Image */}
        <Popover open={imagePopoverOpen} onOpenChange={setImagePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Insert Image URL"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 bg-popover border-border text-popover-foreground" align="start">
            <div className="space-y-2">
              <div className="text-xs font-medium text-foreground">Insert Image by URL</div>
              <Input
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyImage()}
                className="h-8 text-xs bg-background border-input"
              />
              <div className="flex justify-end gap-1.5 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyImage}
                  className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Insert
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* AI / Magic Sparkles Button */}
        <Popover open={aiPopoverOpen} onOpenChange={setAiPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 relative"
              title="AI Assistant"
            >
              {isAiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              ) : (
                <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1.5 bg-popover border-border text-popover-foreground" align="end">
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 border-b border-border mb-1">
              <Wand2 className="h-3 w-3" /> AI Quick Actions
            </div>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => handleAiAction('improve')}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-md text-foreground hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors flex items-center gap-2"
              >
                <span>✨</span> Improve vocabulary & tone
              </button>
              <button
                type="button"
                onClick={() => handleAiAction('concise')}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-md text-foreground dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors flex items-center gap-2"
              >
                <span>✂️</span> Make concise & crisp
              </button>
              <button
                type="button"
                onClick={() => handleAiAction('expand')}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-md text-foreground dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors flex items-center gap-2"
              >
                <span>💡</span> Expand with details
              </button>
              <button
                type="button"
                onClick={() => handleAiAction('bullets')}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-md text-foreground dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors flex items-center gap-2"
              >
                <span>📋</span> Turn into bullet summary
              </button>
              <button
                type="button"
                onClick={() => handleAiAction('fix')}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-md text-foreground dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors flex items-center gap-2"
              >
                <span>🔍</span> Fix punctuation & grammar
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Extra formatting items */}
        <div className="h-5 w-[1px] bg-border mx-0.5" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn(
            'h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted',
            editor.isActive('codeBlock') && 'bg-muted text-foreground'
          )}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            'h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted',
            editor.isActive('blockquote') && 'bg-muted text-foreground'
          )}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Divider Line"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 dark:text-zinc-500 dark:hover:text-zinc-200"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Editor Box */}
      <div
        className="relative rounded-xl border border-border bg-card text-foreground shadow-sm overflow-hidden transition-all duration-200 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 flex flex-col"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} className="flex-1 flex flex-col [&_.ProseMirror]:flex-1 [&_.ProseMirror]:min-h-[460px]" />

        {/* Subtle resize grip corner */}
        <div className="absolute bottom-1.5 right-1.5 pointer-events-none opacity-40">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M9 1L1 9M9 5L5 9M9 9H9.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Footer Info Bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pt-0.5">
        <div>
          {maxCharacters > 0 ? (
            <span>
              <span className={cn('font-medium', charsLeft < 50 ? 'text-amber-500' : 'text-foreground')}>
                {charsLeft}
              </span>{' '}
              characters left
            </span>
          ) : (
            <span>{charCount} characters</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>{editor.storage.characterCount.words()} words</span>
          <span>•</span>
          <span>Rich Text Active</span>
        </div>
      </div>
    </div>
  );
}
