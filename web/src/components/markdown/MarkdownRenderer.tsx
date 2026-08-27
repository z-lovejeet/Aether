"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <div className={`prose-slate max-w-none text-slate-800 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 mt-6 mb-3 pb-2 border-b border-slate-200/80">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 mt-6 mb-3 pt-2 text-indigo-950 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-600 inline-block shrink-0" />
              <span>{children}</span>
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display text-sm sm:text-base font-semibold text-slate-800 mt-4 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-xs sm:text-sm leading-relaxed text-slate-700 my-2.5 font-normal">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-800">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="my-2.5 list-disc list-inside space-y-1 text-xs sm:text-sm text-slate-700 pl-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2.5 list-decimal list-inside space-y-1 text-xs sm:text-sm text-slate-700 pl-1">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-r-2xl border-l-4 border-indigo-500 bg-indigo-50/70 p-3.5 text-xs sm:text-sm italic text-slate-800 shadow-xs">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-2xl border border-slate-200/90 shadow-xs">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs sm:text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100/90 text-slate-800 font-bold uppercase text-[11px] tracking-wider">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-50/70 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 font-bold text-slate-900">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-slate-700 align-top">{children}</td>
          ),
          code: ({ children }) => (
            <code className="rounded-md border border-slate-200/70 bg-slate-100/90 px-1.5 py-0.5 font-mono text-[11px] text-indigo-700 font-medium">
              {children}
            </code>
          ),
          hr: () => <hr className="my-6 border-slate-200/80" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
