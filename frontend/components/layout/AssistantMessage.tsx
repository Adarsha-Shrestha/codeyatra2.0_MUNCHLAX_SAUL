'use client';

import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AIResponse, AISource, ModelId } from '@/types';

// ─── Inline citation parser ───────────────────────────────────────────────────

type CitationSegment = { type: 'citation'; id: number; source: AISource | undefined };

// ─── Inline Citation Badge ────────────────────────────────────────────────────

function CitationBadge({
  seg,
  onClick,
}: {
  seg: CitationSegment;
  onClick?: (src: AISource) => void;
}) {
  const title = seg.source?.title ?? `Source ${seg.id}`;
  return (
    <button
      onClick={() => seg.source && onClick?.(seg.source)}
      title={title}
      className="inline-flex items-center justify-center align-middle mx-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded-md saul-citation border transition-colors leading-none relative -top-0.5 cursor-pointer"
    >
      {seg.id}
    </button>
  );
}

// ─── Answer renderer ──────────────────────────────────────────────────────────

function AnswerText({
  answer,
  sources,
  showCitations,
  onSourceClick,
}: {
  answer: string;
  sources: AISource[];
  showCitations: boolean;
  onSourceClick?: (src: AISource) => void;
}) {
  let processedAnswer = answer;
  if (!showCitations) {
    processedAnswer = answer.replace(/\[SOURCE \d+\]/g, '').replace(/\s{2,}/g, ' ').trim();
  }

  // Pre-process citations if citations are enabled so markdown renderer can handle them
  // A clean way is to replace [SOURCE X] with custom span elements but since we map Markdown components,
  // we can inject a custom markdown format or handle text substitution.
  // For simplicity, we can convert [SOURCE X] into a pseudo-markdown link: `[cite-X](cite-X)`
  if (showCitations) {
    processedAnswer = processedAnswer.replace(/\[SOURCE (\d+)\]/g, '[cite-$1](cite-$1)');
  }

  return (
    <div className="prose prose-invert prose-zinc max-w-none text-[15px] leading-relaxed text-nblm-text mb-4
      prose-headings:font-bold prose-headings:text-zinc-100 prose-headings:mt-6 prose-headings:mb-3
      prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
      prose-p:mb-4 prose-p:last:mb-0
      prose-a:text-blue-400 prose-a:no-underline hover:prose-a:text-blue-300
      prose-strong:text-zinc-200
      prose-ul:list-disc prose-ul:ml-5 prose-ul:mb-4
      prose-ol:list-decimal prose-ol:ml-5 prose-ol:mb-4
      prose-li:my-1
      prose-blockquote:border-l-2 prose-blockquote:border-zinc-700 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-zinc-400
      prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-lg
      prose-code:px-1.5 prose-code:py-0.5 prose-code:bg-zinc-800 prose-code:rounded-md prose-code:text-sm
    ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => {
            const href = props.href || '';
            // Match our pseudo citation link
            const citeMatch = href.match(/^cite-(\d+)$/);
            if (citeMatch) {
              const id = parseInt(citeMatch[1], 10);
              const src = sources.find((s) => s.id === id);
              return (
                <CitationBadge
                  seg={{ type: 'citation', id, source: src }}
                  onClick={onSourceClick}
                />
              );
            }
            return <a {...props}>{props.children}</a>;
          },
        }}
      >
        {processedAnswer}
      </ReactMarkdown>
    </div>
  );
}

// ─── Suggestions section ──────────────────────────────────────────────────────

function SuggestionsSection({ metrics }: { metrics: AIResponse['evaluation_metrics'] }) {
  const text = [metrics.reason, metrics.suggestion].filter(Boolean).join(' ');
  if (!text) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-6"
    >
      <p className="text-[13px] font-semibold text-nblm-text mb-2">Suggestions</p>
      <p className="text-[15px] leading-relaxed text-nblm-text">{text}</p>
    </motion.div>
  );
}

// ─── Sources list ─────────────────────────────────────────────────────────────

function SourcesList({
  sources,
  onSourceClick,
}: {
  sources: AISource[];
  onSourceClick?: (src: AISource) => void;
}) {
  if (!sources.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className="mt-6"
    >
      <p className="text-[13px] font-semibold text-nblm-text mb-3">Sources</p>
      <ul className="space-y-2.5">
        {sources.map((src, i) => (
          <motion.li
            key={src.id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.22 + i * 0.04 }}
          >
            <button
              onClick={() => onSourceClick?.(src)}
              className="flex items-start gap-2 text-left group w-full"
            >
              <ArrowUpRight className="w-4 h-4 text-nblm-text shrink-0 mt-0.5" />
              <span className="text-[15px] text-nblm-text font-medium leading-snug">
                {src.id}. {src.title}
                {src.date !== 'Unknown' && (
                  <span className="text-nblm-text-muted"> · {src.date}</span>
                )}
              </span>
            </button>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AssistantMessageProps {
  response: AIResponse;
  model: ModelId;
  onSourceClick?: (src: AISource) => void;
}

export default function AssistantMessage({ response, model, onSourceClick }: AssistantMessageProps) {
  const showCitations = model === 'evidence-based' || model === 'heavy-duty';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Model mode label */}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-nblm-text-muted/50 select-none mb-3">
        {model === 'briefing' ? 'Briefing' : model === 'evidence-based' ? 'Evidence Based' : 'Heavy Duty'}
      </p>

      {/* Answer */}
      <AnswerText
        answer={response.answer}
        sources={response.sources}
        showCitations={showCitations}
        onSourceClick={onSourceClick}
      />

      {/* Suggestions + Sources — Heavy Duty only */}
      {model === 'heavy-duty' && (
        <>
          <SuggestionsSection metrics={response.evaluation_metrics} />
          <SourcesList sources={response.sources} onSourceClick={onSourceClick} />
        </>
      )}
    </motion.div>
  );
}
