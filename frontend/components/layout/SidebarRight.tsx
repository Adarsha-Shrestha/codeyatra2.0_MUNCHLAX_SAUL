'use client';

import { AlignLeft, PanelRight } from 'lucide-react';
import type { SidebarRightProps, ChecklistAnalytic } from '@/types';
import TodoBlock from '@/components/layout/TodoBlock';

const DEMO_CHECKLIST: ChecklistAnalytic = {
  analytic_type: 'checklist',
  client_case_id: '001',
  report: `### Strategic To-Do List for Client Case\n\n#### Current Status of the Client's Case:\nThe client case involves a criminal trespassing and vandalism incident reported by Ram Bahadur to the Kathmandu Central Police Station on 2024-03-12. A witness, Shyam Thapa, provided an affidavit supporting the FIR.\n\n---\n\n### Mandatory Procedural Checklist\n\n1. *Follow Up on FIR (Date: 2024-03-12)*  \n   - Action: Confirm receipt and status of the First Information Report filed by Ram Bahadur at Kathmandu Central Police Station.\n   - Deadline: Follow-up within a reasonable period to ensure proper handling.\n   - Citation: [FIR.txt (2024-03-12)]\n\n2. *Prepare and Serve Legal Documents*  \n   - Action: Draft and serve the complaint ( FIR document) to Hari Prasad Koirala as required by law.\n   - Deadline: Typically within 15 days from service, unless extended by court order.\n   - Citation: [FIR.txt (Unknown Date)]\n\n3. *Obtain Copy of Affidavit*  \n   - Action: Ensure a copy of Shyam Thapa's affidavit is available for production to the defendant or during court proceedings.\n   - Deadline: Immediate availability upon request from the legal team.\n   - Citation: [Affidavit.txt (2024-03-15)]\n\n4. *Review and Confirm Witness Statements*  \n   - Action: Verify the accuracy of Shyam Thapa's statements to ensure they align with the FIR details.\n   - Deadline: Within 7 days of receiving the affidavit.\n   - Citation: [Affidavit.txt (2024-03-15)]\n\n5. *Schedule Court Proceedings*  \n   - Action: Arrange a court appearance date based on the case timeline and requirements under applicable law.\n   - Deadline: Typically within weeks after service of legal documents, depending on the case type.\n   - Citation: [FIR.txt (2024-03-12)]\n\n---\n\n### Output Format:\n\n markdown\n# Strategic To-Do List for Client Case\n\n## Current Status:\nThe client case involves a criminal trespassing and vandalism incident reported by Ram Bahadur to the Kathmandu Central Police Station on 2024-03-12. A witness, Shyam Thapa, provided an affidavit supporting the FIR.\n\n---\n\n## Mandatory Procedural Checklist\n\n### 1. Follow Up on FIR (Date: 2024-03-12)  \n   - Action: Confirm receipt and status of the First Information Report filed by Ram Bahadur at Kathmandu Central Police Station.\n   - Deadline: Follow-up within a reasonable period to ensure proper handling.\n   - Citation: [FIR.txt (2024-03-12)]\n\n### 2. Prepare and Serve Legal Documents  \n   - Action: Draft and serve the complaint (FIR document) to Hari Prasad Koirala as required by law.\n   - Deadline: Typically within 15 days from service, unless extended by court order.\n   - Citation: [FIR.txt (Unknown Date)]\n\n### 3. Obtain Copy of Affidavit  \n   - Action: Ensure a copy of Shyam Thapa's affidavit is available for production to the defendant or during court proceedings.\n   - Deadline: Immediate availability upon request from the legal team.\n   - Citation: [Affidavit.txt (2024-03-15)]\n\n### 4. Review and Confirm Witness Statements  \n   - Action: Verify the accuracy of Shyam Thapa's statements to ensure they align with the FIR details.\n   - Deadline: Within 7 days of receiving the affidavit.\n   - Citation: [Affidavit.txt (2024-03-15)]\n\n### 5. Schedule Court Proceedings  \n   - Action: Arrange a court appearance date based on the case timeline and requirements under applicable law.\n   - Deadline: Typically within weeks after service of legal documents, depending on the case type.\n   - Citation: [FIR.txt (2024-03-12)]\n`,
  sources: [],
};

export default function SidebarRight({ markdownContent, onSourceClick, onToggle, checklistData }: SidebarRightProps) {
  const todoData = checklistData ?? DEMO_CHECKLIST;
  const headings = markdownContent
    .split('\n')
    .filter(line => line.startsWith('#'))
    .map(line => {
      const level = line.match(/^#+/)?.[0].length || 1;
      const text = line.replace(/^#+\s*/, '').trim();
      return { level, text };
    });

  return (
    <aside className="w-full h-full bg-nblm-bg flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 flex items-center justify-between shrink-0">
        <h2 className="text-[16px] font-semibold text-nblm-text tracking-wide flex items-center gap-2">
          <AlignLeft className="w-5 h-5" /> Table of Contents
        </h2>
        <button onClick={onToggle} title="Collapse sidebar" className="text-nblm-text-muted hover:text-nblm-text transition-colors">
          <PanelRight className="w-5 h-5" />
        </button>
      </div>

      {/* TOC List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {headings.length === 0 ? (
          <p className="text-nblm-text-muted text-sm px-2">No headings found.</p>
        ) : (
          headings.map((heading, idx) => (
            <button
              key={idx}
              onClick={() => onSourceClick(heading.text)}
              className="w-full text-left cursor-pointer text-sm text-nblm-text-muted hover:text-nblm-text hover:bg-nblm-panel rounded-lg px-2 py-1.5 transition-colors truncate block"
              style={{
                paddingLeft: `${(heading.level - 1) * 14 + 8}px`,
                fontSize: heading.level === 1 ? '13px' : heading.level === 2 ? '12px' : '11px'
              }}
              title={heading.text}
            >
              {heading.level <= 2 ? (
                <span className={heading.level === 1 ? 'font-semibold text-nblm-text' : 'font-medium text-nblm-text-muted'}>
                  {heading.text}
                </span>
              ) : (
                <span className="text-nblm-text-muted">{heading.text}</span>
              )}
            </button>
          ))
        )}
      </div>

      {/* ── Todo Block ─────────────────────── */}
      <TodoBlock data={todoData} />
    </aside>
  );
}
