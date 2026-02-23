'use client';

import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import type { AIResponse, AISource, ModelId } from '@/types';

// ─── Inline citation parser ───────────────────────────────────────────────────

type TextSegment = { type: 'text'; text: string };
type CitationSegment = { type: 'citation'; id: number; source: AISource | undefined };
type Segment = TextSegment | CitationSegment;

function parseSegments(text: string, sources: AISource[]): Segment[] {
  const parts = text.split(/(\[SOURCE \d+\])/g);
  return parts.map((part) => {
    const match = part.match(/^\[SOURCE (\d+)\]$/);
    if (match) {
      const id = parseInt(match[1], 10);
      return { type: 'citation', id, source: sources.find((s) => s.id === id) };
    }
    return { type: 'text', text: part };
  });
}

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
  if (!showCitations) {
    const clean = answer.replace(/\[SOURCE \d+\]/g, '').replace(/\s{2,}/g, ' ').trim();
    return (
      <p className="text-[15px] leading-relaxed text-nblm-text whitespace-pre-wrap">{clean}</p>
    );
  }

  const segments = parseSegments(answer, sources);
  return (
    <p className="text-[15px] leading-relaxed text-nblm-text whitespace-pre-wrap">
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <CitationBadge key={i} seg={seg as CitationSegment} onClick={onSourceClick} />
        )
      )}
    </p>
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
