import type { TodoItem, ChecklistAnalytic } from '@/types';

/**
 * Parses the markdown `report` from a checklist analytic response.
 * Extracts `### N. *Title**` level headings as todo items,
 * and the first bullet beneath them as the description.
 */
export function parseChecklistReport(data: ChecklistAnalytic): TodoItem[] {
  const lines = data.report.split('\n');
  const items: TodoItem[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let label: string | null = null;

    // Fast check: start with ##, ###, #### or 1., 2., etc.
    if (line.match(/^(?:#{2,4}\s+|\d+[\.:]\s+)/)) {
      // Remove leading headers, numbers, and formatting
      let cleanLine = line.replace(/^(?:#{2,4}\s+)?(?:\d+[\.:]\s*)?/, '').trim();
      cleanLine = cleanLine.replace(/\*/g, '').replace(/_/g, '').trim();

      // Ignore some generic headers that are not tasks
      const lower = cleanLine.toLowerCase();
      if (!lower.includes('procedural checklist') &&
        !lower.includes('strategic to-do list') &&
        cleanLine.length > 0) {
        label = cleanLine;
      }
    }

    if (label) {
      // Look ahead for first non-empty bullet line or text
      let description: string | undefined;
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const next = lines[j].trim();

        // If we hit another heading or numbered list, stop looking
        if (next.match(/^(?:#{2,4}\s+|\d+[\.:]\s+)/)) {
          break;
        }

        if (next.length > 0) {
          description = next
            .replace(/^[-*]\s+/, '')
            .replace(/\[.*?\]/g, '')
            .replace(/\*{1,2}/g, '')
            .trim();
          if (description.length > 200) description = description.slice(0, 197) + '…';

          // Only break if we successfully extracted a meaningful description
          if (description.length > 0) {
            break;
          }
        }
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
