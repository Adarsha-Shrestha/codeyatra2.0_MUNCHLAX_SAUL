// ─── Layout Constants ─────────────────────────────────────────────────────────

export const SIDEBAR_WIDTH = 320;
export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 520;
export const CHAT_MIN_WIDTH = 420;

// ─── Analytics TOC Content ────────────────────────────────────────────────────

export const ANALYTICS_MARKDOWN = `
# Case Analysis
## Procedural Checklist
## Evidence Gap Analysis
## Argument Mapping
## Risk Assessment
## Compliance Tracker
`;

// Maps TOC heading text → backend analytic_type
export const ANALYTICS_HEADING_MAP: Record<string, string> = {
  'Procedural Checklist': 'checklist',
  'Evidence Gap Analysis': 'gap_analysis',
  'Argument Mapping': 'argument_mapping',
  'Risk Assessment': 'risk_assessment',
  'Compliance Tracker': 'compliance_tracker',
};

// ─── Legacy Sample Markdown (kept for reference) ─────────────────────────────

export const SAMPLE_MARKDOWN = `
# Principles and Operations of Relational Algebra
## 1. Introduction
Relational algebra is a mathematical framework for querying relational data.
## 2. Core Operations
Here are the core operators of relational algebra.
### 2.1 Selection (σ)
Selection is like a sieve—it filters rows based on a condition.
### 2.2 Projection (π)
Projection acts like a mask—it shows only specific columns.
### 2.3 Union (∪)
Combines the tuples of two relations into one.
### 2.4 Difference (−)
Returns tuples in one relation but not the other.
### 2.5 Cartesian Product (×)
Produces all combinations of tuples from two relations.
## 3. Joins
Joins connect different parts of data together.
### 3.1 Natural Join (⋈)
Automatically joins on common attributes.
### 3.2 Left Outer Join (⟕)
Includes all tuples from the left relation.
### 3.3 Right Outer Join (⟖)
Includes all tuples from the right relation.
### 3.4 Full Outer Join (⟗)
Includes all tuples from both relations.
## 4. Extended Operators
### 4.1 Division (÷)
Used for "for all" queries.
### 4.2 Rename (ρ)
Renames a relation or its attributes.
### 4.3 Aggregate Functions (𝓖)
Performs Sum, Avg, Count, etc.
## 5. Summary
Relational algebra symbols are tools in a specialized workshop. The Selection (σ) tool acts like a sieve, while Projection (π) acts like a mask, and Join (⋈) acts like industrial glue.
`;
