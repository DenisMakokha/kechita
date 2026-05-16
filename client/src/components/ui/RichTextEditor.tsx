import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
    Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
    Link as LinkIcon, Image as ImageIcon, Heading2, Heading3,
    Quote, Code as CodeIcon, Undo, Redo, Eraser
} from 'lucide-react';

/**
 * Lightweight rich-text editor built on `contentEditable` + `document.execCommand`.
 *
 * Why not pull in tiptap/quill? Keeps the bundle small and dependency-free.
 * Output is HTML stored in `value`. Use {@link sanitizeAnnouncementHtml} when
 * rendering the resulting HTML elsewhere to defang scripts.
 *
 * Image insertion encodes selected files as base64 data URIs so no upload
 * endpoint is needed. Large images should be resized client-side first.
 */
export interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: number;
    /** Maximum size for inline image inserts. Defaults to 2 MB. */
    maxImageBytes?: number;
}

const exec = (cmd: string, val?: string) => {
    // execCommand is deprecated but still universally supported in Chromium-/
    // WebKit-/Gecko-based browsers and works fine for contentEditable surfaces.
    // eslint-disable-next-line deprecation/deprecation
    document.execCommand(cmd, false, val);
};

const isActive = (cmd: string): boolean => {
    try {
        // eslint-disable-next-line deprecation/deprecation
        return document.queryCommandState(cmd);
    } catch {
        return false;
    }
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = 'Write your announcement…',
    minHeight = 220,
    maxImageBytes = 2 * 1024 * 1024,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [, setTick] = useState(0); // re-render to update toolbar active states

    // Sync external value into the editor only when it differs (avoid wiping
    // the user's caret while typing).
    useEffect(() => {
        const el = editorRef.current;
        if (el && value !== el.innerHTML) {
            el.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const refreshToolbar = useCallback(() => setTick(t => t + 1), []);

    useEffect(() => {
        document.addEventListener('selectionchange', refreshToolbar);
        return () => document.removeEventListener('selectionchange', refreshToolbar);
    }, [refreshToolbar]);

    const focusEditor = () => editorRef.current?.focus();

    const run = (cmd: string, val?: string) => {
        focusEditor();
        exec(cmd, val);
        refreshToolbar();
        handleInput();
    };

    const insertLink = () => {
        const url = window.prompt('Enter URL (https://…)');
        if (!url) return;
        const safe = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        run('createLink', safe);
        // Force target=_blank on newly inserted link if possible
        const sel = window.getSelection();
        const node = sel?.anchorNode?.parentElement;
        if (node && node.tagName === 'A') {
            (node as HTMLAnchorElement).target = '_blank';
            (node as HTMLAnchorElement).rel = 'noopener noreferrer';
        }
        handleInput();
    };

    const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            window.alert('Only image files are supported.');
            return;
        }
        if (file.size > maxImageBytes) {
            window.alert(`Image is too large. Max ${(maxImageBytes / 1024 / 1024).toFixed(1)} MB.`);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result || '');
            if (!dataUrl) return;
            focusEditor();
            // Use insertHTML so we can apply our default styling.
            const html = `<img src="${dataUrl}" alt="${file.name.replace(/"/g, '')}" style="max-width:100%;height:auto;border-radius:6px;margin:6px 0;" />`;
            exec('insertHTML', html);
            handleInput();
        };
        reader.readAsDataURL(file);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        // Strip rich formatting from external paste sources (Word/Docs leave
        // lots of MSO style cruft). Allow images via dataTransfer.files.
        const items = e.clipboardData?.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                if (it.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = it.getAsFile();
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                        const dataUrl = String(reader.result || '');
                        const html = `<img src="${dataUrl}" alt="pasted" style="max-width:100%;height:auto;border-radius:6px;margin:6px 0;" />`;
                        focusEditor();
                        exec('insertHTML', html);
                        handleInput();
                    };
                    reader.readAsDataURL(file);
                    return;
                }
            }
        }
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (text) exec('insertText', text);
    };

    const Btn: React.FC<{
        cmd?: string;
        icon: React.ComponentType<{ size?: number }>;
        label: string;
        onClick?: () => void;
        active?: boolean;
    }> = ({ cmd, icon: Icon, label, onClick, active }) => {
        const isOn = active ?? (cmd ? isActive(cmd) : false);
        return (
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // keep selection
                onClick={onClick ?? (() => cmd && run(cmd))}
                title={label}
                aria-label={label}
                aria-pressed={isOn}
                className={`p-1.5 rounded-md transition-colors ${
                    isOn ? 'bg-[#0066B3] text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
                <Icon size={16} />
            </button>
        );
    };

    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#0066B3] focus-within:border-transparent bg-white">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
                <Btn cmd="bold" icon={Bold} label="Bold" />
                <Btn cmd="italic" icon={Italic} label="Italic" />
                <Btn cmd="underline" icon={UnderlineIcon} label="Underline" />
                <span className="w-px h-5 bg-slate-200 mx-1" />
                <Btn
                    icon={Heading2}
                    label="Heading 2"
                    onClick={() => run('formatBlock', '<h2>')}
                    active={false}
                />
                <Btn
                    icon={Heading3}
                    label="Heading 3"
                    onClick={() => run('formatBlock', '<h3>')}
                    active={false}
                />
                <Btn
                    icon={Quote}
                    label="Quote"
                    onClick={() => run('formatBlock', '<blockquote>')}
                    active={false}
                />
                <span className="w-px h-5 bg-slate-200 mx-1" />
                <Btn cmd="insertUnorderedList" icon={List} label="Bulleted list" />
                <Btn cmd="insertOrderedList" icon={ListOrdered} label="Numbered list" />
                <span className="w-px h-5 bg-slate-200 mx-1" />
                <Btn icon={LinkIcon} label="Insert link" onClick={insertLink} active={false} />
                <Btn
                    icon={ImageIcon}
                    label="Insert image"
                    onClick={() => fileInputRef.current?.click()}
                    active={false}
                />
                <Btn
                    icon={CodeIcon}
                    label="Inline code"
                    onClick={() => run('formatBlock', '<pre>')}
                    active={false}
                />
                <span className="w-px h-5 bg-slate-200 mx-1" />
                <Btn icon={Undo} label="Undo" onClick={() => run('undo')} active={false} />
                <Btn icon={Redo} label="Redo" onClick={() => run('redo')} active={false} />
                <Btn
                    icon={Eraser}
                    label="Clear formatting"
                    onClick={() => run('removeFormat')}
                    active={false}
                />

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImagePick}
                />
            </div>

            {/* Editable surface */}
            <div
                ref={editorRef}
                contentEditable
                role="textbox"
                aria-multiline="true"
                aria-label="Rich text editor"
                onInput={handleInput}
                onBlur={handleInput}
                onPaste={handlePaste}
                onKeyUp={refreshToolbar}
                onMouseUp={refreshToolbar}
                suppressContentEditableWarning
                data-placeholder={placeholder}
                className="prose-editor px-4 py-3 text-sm text-slate-800 outline-none overflow-y-auto"
                style={{ minHeight }}
            />

            <style>{`
                .prose-editor:empty::before {
                    content: attr(data-placeholder);
                    color: rgb(148 163 184); /* slate-400 */
                    pointer-events: none;
                }
                .prose-editor h2 { font-size: 1.25rem; font-weight: 700; margin: 0.75rem 0 0.5rem; }
                .prose-editor h3 { font-size: 1.05rem; font-weight: 600; margin: 0.6rem 0 0.4rem; }
                .prose-editor p  { margin: 0.35rem 0; }
                .prose-editor ul { list-style: disc; padding-left: 1.5rem; margin: 0.4rem 0; }
                .prose-editor ol { list-style: decimal; padding-left: 1.5rem; margin: 0.4rem 0; }
                .prose-editor a  { color: #0066B3; text-decoration: underline; }
                .prose-editor blockquote {
                    border-left: 3px solid #cbd5e1;
                    padding-left: 0.75rem;
                    color: #475569;
                    margin: 0.5rem 0;
                }
                .prose-editor pre {
                    background: #f1f5f9;
                    padding: 0.5rem 0.75rem;
                    border-radius: 0.375rem;
                    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                    font-size: 0.85em;
                    white-space: pre-wrap;
                }
                .prose-editor img { max-width: 100%; height: auto; border-radius: 6px; }
            `}</style>
        </div>
    );
};

/**
 * Minimal HTML sanitizer for announcement content. Strips <script>, <iframe>,
 * <object>, <embed>, all `on*` event handler attributes, and javascript: URIs.
 * Allows inline `data:image/*` URIs (used by the editor for inline images).
 *
 * This is intentionally simple — content is authored by trusted internal admins
 * but rendered to all staff, so we still defang the obvious XSS vectors.
 */
export const sanitizeAnnouncementHtml = (html: string): string => {
    if (!html) return '';
    if (typeof document === 'undefined') return html;

    const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, 'text/html');
    const root = doc.getElementById('__root');
    if (!root) return '';

    const BLOCKED_TAGS = new Set(['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'STYLE', 'LINK', 'META']);

    const walk = (node: Element) => {
        // Snapshot children since we may remove nodes during iteration.
        Array.from(node.children).forEach(child => {
            if (BLOCKED_TAGS.has(child.tagName)) {
                child.remove();
                return;
            }

            // Strip event-handler and javascript: attributes.
            Array.from(child.attributes).forEach(attr => {
                const name = attr.name.toLowerCase();
                const val = attr.value || '';
                if (name.startsWith('on')) {
                    child.removeAttribute(attr.name);
                    return;
                }
                if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(val)) {
                    child.removeAttribute(attr.name);
                    return;
                }
            });

            // Force safe link targets.
            if (child.tagName === 'A') {
                (child as HTMLAnchorElement).target = '_blank';
                (child as HTMLAnchorElement).rel = 'noopener noreferrer';
            }

            walk(child);
        });
    };

    walk(root);
    return root.innerHTML;
};
