import type { Application } from '../../types'

// Prompt builders. Inputs are stripped/truncated before sending (PRD §7.3):
// posting ≤ ~6k chars, resume ≤ ~8k chars.

export const POSTING_LIMIT = 6000
export const RESUME_LIMIT = 8000

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s
}

export interface Prompt {
  system: string
  user: string
}

// A compact text description of a job used across kit prompts.
export function postingSummary(app: Application): string {
  const parts = [
    `Company: ${app.company}`,
    `Role: ${app.title}`,
    app.location && `Location: ${app.location}`,
    app.salary && `Salary: ${app.salary}`,
    app.remote != null && `Remote: ${app.remote ? 'yes' : 'no'}`,
    app.skills?.length && `Skills: ${app.skills.join(', ')}`,
    app.description && `Description:\n${truncate(app.description, POSTING_LIMIT)}`,
  ].filter(Boolean)
  return parts.join('\n')
}

// ── Import: strict-JSON extraction from raw posting text (PRD §2) ────────────

export function parsePrompt(rawText: string): Prompt {
  return {
    system:
      'You extract structured job-posting data. Respond with ONLY a JSON object, ' +
      'no markdown, no commentary. Use null for any field you cannot determine.',
    user:
      'Extract this job posting into JSON with exactly these keys: ' +
      '{"company": string, "title": string, "location": string|null, ' +
      '"salary": string|null, "remote": boolean|null, "skills": string[], ' +
      '"summary": string}. The summary is 1-2 sentences.\n\n' +
      truncate(rawText, POSTING_LIMIT),
  }
}

// ── Apply Kit prompts ───────────────────────────────────────────────────────

function withResume(resume: string, body: string): string {
  const r = resume.trim()
    ? `My resume:\n${truncate(resume, RESUME_LIMIT)}\n\n`
    : 'I have not provided a resume; work from the job details only.\n\n'
  return r + body
}

export function coverLetterPrompt(app: Application, resume: string): Prompt {
  return {
    system:
      'You are an expert career writer. Write in a confident, specific, ' +
      'human voice. No clichés, no "I am writing to apply". 220-280 words.',
    user: withResume(
      resume,
      `Write a cover letter for this role.\n\n${postingSummary(app)}`,
    ),
  }
}

export function bulletsPrompt(app: Application, resume: string): Prompt {
  return {
    system:
      'You rewrite resume bullets to match a job posting. Return 4-6 bullets, ' +
      'one per line, each starting with "• ". Use strong verbs and quantify ' +
      'where the resume supports it. Do not invent experience.',
    user: withResume(
      resume,
      `Rewrite my most relevant resume bullets to target this role, ` +
        `echoing its keywords where truthful.\n\n${postingSummary(app)}`,
    ),
  }
}

export function screeningPrompt(app: Application, resume: string): Prompt {
  return {
    system:
      'You draft answers to common application screening questions. Answer ' +
      'each under its own heading. Be specific to this company and role.',
    user: withResume(
      resume,
      `Draft answers to: "Why this company?", "Why this role?", ` +
        `"Salary expectations strategy", and "Availability / notice period".\n\n` +
        postingSummary(app),
    ),
  }
}

export function fitCheckPrompt(app: Application, resume: string): Prompt {
  return {
    system:
      'You assess candidate-role fit honestly. Respond with ONLY a JSON object, ' +
      'no markdown: {"score": integer 1-10, "gaps": string[3], "summary": string}. ' +
      'gaps are the three biggest concerns; summary is one sentence.',
    user: withResume(
      resume,
      `Assess my fit for this role.\n\n${postingSummary(app)}`,
    ),
  }
}

export function interviewPrepPrompt(app: Application, resume: string): Prompt {
  return {
    system:
      'You are an interview coach. Return 8 likely interview questions for this ' +
      'role, each followed by a one-line angle on how to answer it. Number them.',
    user: withResume(
      resume,
      `Prepare me for interviews for this role.\n\n${postingSummary(app)}`,
    ),
  }
}
