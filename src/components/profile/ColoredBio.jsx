/**
 * src/components/profile/ColoredBio.jsx
 * Dynamic Colorful Bio Renderer & Cyber IDE Code Highlighter
 * 
 * Capabilities:
 * 1. Automatic Code/Object Detection:
 *    Renders JSON, Lua, TypeScript, or object-like biographies as a stunning
 *    Cyberpunk IDE Code Card with window dots, glowing keys, emerald strings,
 *    amber numbers, and gold brackets.
 * 2. Custom Color Tags (BBCode & Markdown):
 *    Supports [color=cyan]text[/color], [pink]text[/pink], [gradient]text[/gradient],
 *    **bold**, and `code` inline pills.
 * 3. Graceful Plain Text Fallback:
 *    Renders regular text cleanly with zero overhead.
 */

import React, { useMemo } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

/**
 * Checks if a bio string looks like code or an object literal
 */
export function isCodeLikeBio(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  // Check for object or table signatures: e.g. key = { ... } or { "key": ... }
  const hasBraces = trimmed.includes('{') && trimmed.includes('}');
  const hasColonOrEquals = trimmed.includes(':') || trimmed.includes('=');
  const hasQuotes = trimmed.includes('"') || trimmed.includes("'");
  const hasMultipleLines = trimmed.split('\n').length >= 3;

  return (hasBraces && (hasColonOrEquals || hasQuotes)) || (hasColonOrEquals && hasQuotes && hasMultipleLines);
}

/**
 * Syntax-highlights a single line of code-like text
 */
function highlightCodeLine(line, lineIndex) {
  if (!line.trim()) {
    return <span key={lineIndex}>&nbsp;</span>;
  }

  // Comments: // ... or -- ... or # ...
  if (/^\s*(\/\/|--|#)/.test(line)) {
    return (
      <span key={lineIndex} className="text-slate-500 italic font-mono">
        {line}
      </span>
    );
  }

  // Tokenize line using regex matcher for keys, values, brackets, punctuation
  const tokenRegex = /(".*?"|'.*?'|\b\d+(\.\d+)?\b|\btrue\b|\bfalse\b|\bnull\b|\bnil\b|[{}\[\]]|[:=,]|[\w$]+|[^\s\w$"'{}[:=,]+|\s+)/g;
  const tokens = line.match(tokenRegex) || [line];

  let isKeyPosition = true;

  const renderedTokens = tokens.map((token, idx) => {
    // Whitespace
    if (/^\s+$/.test(token)) {
      return <span key={idx}>{token}</span>;
    }

    // Brackets and Braces
    if (/^[{}[\]]$/.test(token)) {
      isKeyPosition = true;
      return (
        <span key={idx} className="text-amber-400 font-bold">
          {token}
        </span>
      );
    }

    // Separators : or =
    if (token === ':' || token === '=') {
      isKeyPosition = false;
      return (
        <span key={idx} className="text-pink-400 font-bold mx-0.5">
          {token}
        </span>
      );
    }

    // Comma
    if (token === ',') {
      isKeyPosition = true;
      return (
        <span key={idx} className="text-slate-400">
          {token}
        </span>
      );
    }

    // String literals: "..." or '...'
    if (/^(".*?"|'.*?')$/.test(token)) {
      if (isKeyPosition) {
        return (
          <span
            key={idx}
            className="text-cyan-300 font-semibold drop-shadow-[0_0_6px_rgba(0,240,255,0.4)]"
          >
            {token}
          </span>
        );
      }
      return (
        <span key={idx} className="text-emerald-300 font-mono">
          {token}
        </span>
      );
    }

    // Numbers
    if (/^\b\d+(\.\d+)?\b$/.test(token)) {
      return (
        <span key={idx} className="text-orange-400 font-bold">
          {token}
        </span>
      );
    }

    // Booleans / Nil
    if (/^(true|false|null|nil)$/i.test(token)) {
      return (
        <span key={idx} className="text-purple-400 font-bold">
          {token}
        </span>
      );
    }

    // Identifiers (e.g. Variable name before =)
    if (/^[a-zA-Z_$][\w$]*$/.test(token)) {
      return (
        <span key={idx} className="text-pink-400 font-bold">
          {token}
        </span>
      );
    }

    return <span key={idx} className="text-theme-main">{token}</span>;
  });

  return <div key={lineIndex} className="leading-relaxed">{renderedTokens}</div>;
}

/**
 * Parses BBCode style color tags:
 * [color=cyan]text[/color], [pink]text[/pink], [gradient]text[/gradient], **bold**, `code`
 */
export function parseRichColorText(text) {
  if (!text || typeof text !== 'string') return null;

  // Split text by tags
  // Tag pattern: \[(color=([#\w-]+)|([a-z]+))\](.*?)\[\/(?:color|\3)\]|\*\*(.*?)\*\*|`(.*?)`
  const parts = [];
  let remaining = text;
  let keyIndex = 0;

  const colorTagRegex = /\[(color=([#a-zA-Z0-9]+)|([a-zA-Z0-9]+))\]([\s\S]*?)\[\/(?:color|\3)\]/i;
  const boldRegex = /\*\*(.*?)\*\*/;
  const codeRegex = /`(.*?)`/;

  const namedColorMap = {
    cyan: '#00f0ff',
    pink: '#ff007f',
    magenta: '#ff007f',
    purple: '#a855f7',
    green: '#10b981',
    emerald: '#10b981',
    yellow: '#fbbf24',
    gold: '#fbbf24',
    amber: '#f59e0b',
    orange: '#fb923c',
    red: '#f43f5e',
    blue: '#38bdf8',
    white: '#ffffff',
  };

  // Process text line by line to preserve newlines
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    let cursor = 0;
    const lineElements = [];

    // Master tokenizer regex for this line
    const regex = /\[(color=([#a-zA-Z0-9]+)|([a-zA-Z0-9]+))\]([\s\S]*?)\[\/(?:color|\3)\]|\*\*(.*?)\*\*|`(.*?)`|(\b#[a-zA-Z0-9_]+\b)/gi;
    let match;

    while ((match = regex.exec(line)) !== null) {
      // Push text before match
      if (match.index > cursor) {
        lineElements.push(
          <span key={`text-${lineIdx}-${cursor}`}>{line.slice(cursor, match.index)}</span>
        );
      }

      // Check which group matched
      if (match[1]) {
        // Color tag
        const colorArg = (match[2] || match[3] || '').toLowerCase();
        const content = match[4];

        if (colorArg === 'gradient' || colorArg === 'rainbow') {
          lineElements.push(
            <span
              key={`grad-${lineIdx}-${match.index}`}
              className="bg-gradient-to-r from-theme-primary via-theme-secondary to-theme-accent bg-clip-text text-transparent font-bold animate-pulse"
            >
              {content}
            </span>
          );
        } else {
          const resolvedColor = namedColorMap[colorArg] || (colorArg.startsWith('#') ? colorArg : colorArg);
          lineElements.push(
            <span
              key={`col-${lineIdx}-${match.index}`}
              style={{ color: resolvedColor, textShadow: `0 0 10px ${resolvedColor}40` }}
              className="font-medium"
            >
              {content}
            </span>
          );
        }
      } else if (match[5]) {
        // Bold
        lineElements.push(
          <strong key={`b-${lineIdx}-${match.index}`} className="font-bold text-white">
            {match[5]}
          </strong>
        );
      } else if (match[6]) {
        // Code
        lineElements.push(
          <code
            key={`code-${lineIdx}-${match.index}`}
            className="px-1.5 py-0.5 rounded bg-black/60 border border-theme-glow/30 text-theme-primary font-mono text-[11px]"
          >
            {match[6]}
          </code>
        );
      } else if (match[7]) {
        // Hashtag
        lineElements.push(
          <span
            key={`tag-${lineIdx}-${match.index}`}
            className="text-theme-primary font-bold hover:underline cursor-pointer"
          >
            {match[7]}
          </span>
        );
      }

      cursor = match.index + match[0].length;
    }

    // Trailing text
    if (cursor < line.length) {
      lineElements.push(
        <span key={`text-${lineIdx}-${cursor}`}>{line.slice(cursor)}</span>
      );
    }

    return (
      <div key={`line-${lineIdx}`} className="min-h-[1.25rem]">
        {lineElements.length > 0 ? lineElements : <>&nbsp;</>}
      </div>
    );
  });
}

/**
 * ColoredBio Component
 * 
 * @param {Object} props
 * @param {string} props.bio - Biography raw text
 * @param {string} [props.handle='dev'] - Optional handle to name the IDE file tab
 * @param {string} [props.className=''] - Additional CSS classes
 */
export default function ColoredBio({ bio, handle = 'dev', className = '' }) {
  const [copied, setCopied] = React.useState(false);

  const isCode = useMemo(() => isCodeLikeBio(bio), [bio]);
  const hasColorTags = useMemo(() => {
    return bio && (bio.includes('[color') || bio.includes('[cyan]') || bio.includes('[pink]') || bio.includes('**') || bio.includes('`'));
  }, [bio]);

  if (!bio || typeof bio !== 'string') {
    return null;
  }

  // Handle Copy Code action
  const handleCopy = (e) => {
    e?.stopPropagation();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(bio);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Clean filename for the IDE tab
  const fileName = handle
    ? `${handle.replace(/^@/, '') || 'profile'}.json`
    : 'profile.json';

  // 1. RENDER AS CYBER IDE CODE WIDGET
  if (isCode) {
    const lines = bio.split('\n');

    return (
      <div
        className={`relative my-2.5 rounded-2xl overflow-hidden bg-[#07090e]/90 backdrop-blur-xl border border-theme-glow/30 shadow-[0_4px_24px_rgba(0,0,0,0.5)] font-mono text-xs max-w-3xl transition-all duration-300 hover:border-theme-primary/50 group ${className}`}
      >
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-black/70 border-b border-theme-glow/20 select-none">
          {/* macOS window dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/90 border border-[#e0443e]/80 inline-block shadow-sm" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/90 border border-[#dea123]/80 inline-block shadow-sm" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/90 border border-[#1aab29]/80 inline-block shadow-sm" />
            <span className="ml-2 text-[11px] text-theme-sub flex items-center gap-1 font-semibold opacity-80">
              <Terminal className="w-3 h-3 text-theme-primary" />
              <span>{fileName}</span>
            </span>
          </div>

          {/* Quick Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-theme-sub hover:text-white transition-all border border-white/5"
            title="Copy Code to Clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 opacity-70" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content Container with line numbers */}
        <div className="p-3.5 overflow-x-auto text-[11px] sm:text-xs leading-relaxed selection:bg-theme-primary/30">
          <div className="flex">
            {/* Subtle line numbers */}
            <div className="select-none text-right pr-3.5 text-slate-600 border-r border-slate-800/80 shrink-0 font-mono">
              {lines.map((_, i) => (
                <div key={i} className="leading-relaxed">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Syntax-highlighted code lines */}
            <div className="pl-3.5 min-w-0 flex-1 font-mono">
              {lines.map((line, idx) => highlightCodeLine(line, idx))}
            </div>
          </div>
        </div>

        {/* Bottom subtle glowing edge */}
        <div className="h-0.5 w-full bg-gradient-to-r from-theme-primary/30 via-theme-secondary/30 to-theme-accent/30 opacity-40 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  // 2. RENDER AS RICH COLORED TEXT WITH TAGS
  if (hasColorTags) {
    return (
      <div className={`text-sm sm:text-base leading-relaxed max-w-3xl font-sans break-words pt-1 ${className}`}>
        {parseRichColorText(bio)}
      </div>
    );
  }

  // 3. CLEAN STANDARD BIO
  return (
    <p className={`text-sm sm:text-base text-theme-sub leading-relaxed max-w-3xl font-sans break-words whitespace-pre-line pt-1 ${className}`}>
      {bio}
    </p>
  );
}
