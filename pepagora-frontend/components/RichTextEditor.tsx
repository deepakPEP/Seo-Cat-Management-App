"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { 
  LuBold, 
  LuItalic, 
  LuUnderline,
  LuStrikethrough,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuList,
  LuListOrdered,
  LuQuote,
  LuCode,
  LuUndo,
  LuRedo,
  LuAlignLeft,
  LuAlignCenter,
  LuAlignRight,
  LuLink,
  LuImage,
  LuSeparatorHorizontal
} from "react-icons/lu";

type Props = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
};

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Start typing...",
  className = "",
  minHeight = "200px",
  disabled = false
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
    ],
    content: value || "",
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none ${className}`,
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return (
      <div className="border border-slate-300 rounded-xl p-4 bg-slate-50">
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center space-x-2 text-slate-500">
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Loading editor...</span>
          </div>
        </div>
      </div>
    );
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive, 
    icon: Icon, 
    tooltip, 
    disabled: buttonDisabled 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    icon: React.ElementType; 
    tooltip: string;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || buttonDisabled}
      title={tooltip}
      className={`
        p-2 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
        ${isActive 
          ? "bg-blue-600 text-white shadow-md" 
          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 hover:border-slate-300"
        }
      `}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  const ToolbarDivider = () => (
    <div className="w-px h-8 bg-slate-200 mx-1"></div>
  );

  return (
    <div className={`border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm ${disabled ? 'opacity-60' : ''}`}>
      {/* Professional Toolbar */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-3">
        <div className="flex flex-wrap items-center gap-1">
          {/* Text Formatting */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              icon={LuBold}
              tooltip="Bold (Ctrl+B)"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              icon={LuItalic}
              tooltip="Italic (Ctrl+I)"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive("strike")}
              icon={LuStrikethrough}
              tooltip="Strikethrough"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive("code")}
              icon={LuCode}
              tooltip="Inline Code"
            />
          </div>

          <ToolbarDivider />

          {/* Headings */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive("heading", { level: 1 })}
              icon={LuHeading1}
              tooltip="Heading 1"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive("heading", { level: 2 })}
              icon={LuHeading2}
              tooltip="Heading 2"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive("heading", { level: 3 })}
              icon={LuHeading3}
              tooltip="Heading 3"
            />
          </div>

          <ToolbarDivider />

          {/* Lists & Quotes */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              icon={LuList}
              tooltip="Bullet List"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              icon={LuListOrdered}
              tooltip="Numbered List"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
              icon={LuQuote}
              tooltip="Blockquote"
            />
          </div>

          <ToolbarDivider />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              icon={LuSeparatorHorizontal}
              tooltip="Horizontal Rule"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              icon={LuUndo}
              tooltip="Undo (Ctrl+Z)"
              disabled={!editor.can().undo()}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              icon={LuRedo}
              tooltip="Redo (Ctrl+Y)"
              disabled={!editor.can().redo()}
            />
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative">
        <EditorContent 
          editor={editor} 
          className={`
            prose prose-slate max-w-none p-4 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20 transition-all
            prose-headings:text-slate-900 prose-headings:font-semibold
            prose-p:text-slate-700 prose-p:leading-relaxed
            prose-strong:text-slate-900 prose-strong:font-semibold
            prose-code:bg-slate-100 prose-code:text-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:px-4 prose-blockquote:py-2
            prose-ul:list-disc prose-ol:list-decimal
            prose-li:text-slate-700
            prose-hr:border-slate-300
          `}
          style={{ minHeight }}
        />
        
        {/* Placeholder */}
        {editor.isEmpty && (
          <div className="absolute top-4 left-4 text-slate-400 pointer-events-none select-none">
            {placeholder}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 text-xs text-slate-500 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span>Characters: {editor.storage.characterCount?.characters() || 0}</span>
          <span>Words: {editor.storage.characterCount?.words() || 0}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${disabled ? 'bg-red-400' : 'bg-green-400'}`}></div>
          <span>{disabled ? 'Read-only' : 'Ready'}</span>
        </div>
      </div>
    </div>
  );
}
