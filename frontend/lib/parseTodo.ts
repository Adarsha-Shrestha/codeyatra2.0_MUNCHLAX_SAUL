import type { TodoItem, ChecklistAnalytic } from '@/types';

/**
 * Parses the markdown `report` from a checklist analytic response.
 * Extracts `### N. *Title**` level headings as todo items,
 * and the first bullet beneath them as the description.
 */
export function parseChecklistReport(data: ChecklistAnalytic): TodoItem[] {
  const lines = data.report.split('\n');
  const items: TodoItem[] = [];

  // Regex: matches lines like "### 1. *File a Complaint**" or "### 2. **Arrange for a Trial Date**"
  const headingRe = /^###\s+\d+\.\s+\*{1,2}(.+?)\*{2,4}\s*$/;
  // Also matches simpler: ### 1. Title
  const headingReFallback = /^###\s+(\d+)\.\s+(.+)$/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let label: string | null = null;

    const m = line.match(headingRe);
    if (m) {
      // Strip any remaining asterisks
      label = m[1].replace(/\*/g, '').trim();
    } else {
      const mFb = line.match(headingReFallback);
      if (mFb) {
        label = mFb[2].replace(/\*/g, '').trim();
      }
    }

    if (label) {
      // Look ahead for first non-empty bullet line
      let description: string | undefined;
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const next = lines[j].trim();
        if (next.startsWith('- ') || next.startsWith('* ')) {
          // Remove citation patterns like [FIR.txt]
          description = next
            .replace(/^[-*]\s+/, '')
            .replace(/\[.*?\]/g, '')
            .replace(/\*{1,2}/g, '')
            .trim();
          if (description.length > 100) description = description.slice(0, 97) + '…';
          break;
        }
        if (next.startsWith('###') || next.startsWith('##')) break;
      }

      items.push({
        id: `${data.client_case_id}-${items.length + 1}`,
        label,
        description,
        done: false,
      });
    }

    i++;
  }

  return items;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_PREFIX = 'saul-todos-';

export function loadDoneState(caseId: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LS_PREFIX + caseId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDoneState(caseId: string, state: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_PREFIX + caseId, JSON.stringify(state));
}
