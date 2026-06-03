import fs from 'node:fs'
import path from 'node:path'
import { Fragment, type ReactNode } from 'react'

// Renders one of our trusted in-repo legal markdown files (docs/legal/*.md).
// Supports the small subset of markdown those drafts use: #/##/### headings,
// blockquote callouts, --- rules, **bold**, and blank-line paragraphs.

function renderInline(text: string): ReactNode[] {
  return text.split('**').map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>,
  )
}

export function LegalDocument({ slug }: { slug: string }) {
  const filePath = path.join(process.cwd(), 'docs', 'legal', `${slug}.md`)
  const raw = fs.readFileSync(filePath, 'utf8')
  const lines = raw.split(/\r?\n/)

  const blocks: ReactNode[] = []
  let paragraph: string[] = []
  let key = 0

  function flushParagraph() {
    if (paragraph.length === 0) return
    const buffer = paragraph
    blocks.push(
      <p key={key++} className="text-body-md leading-relaxed text-text-secondary">
        {buffer.map((line, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {renderInline(line)}
          </Fragment>
        ))}
      </p>,
    )
    paragraph = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      continue
    }
    if (/^---+$/.test(trimmed)) {
      flushParagraph()
      blocks.push(<hr key={key++} className="my-8 border-glass-border" />)
      continue
    }
    if (line.startsWith('### ')) {
      flushParagraph()
      blocks.push(
        <h3 key={key++} className="mt-8 text-headline-md text-text-primary">
          {renderInline(line.slice(4))}
        </h3>,
      )
      continue
    }
    if (line.startsWith('## ')) {
      flushParagraph()
      blocks.push(
        <h2 key={key++} className="mt-10 text-headline-md text-text-primary">
          {renderInline(line.slice(3))}
        </h2>,
      )
      continue
    }
    if (line.startsWith('# ')) {
      flushParagraph()
      blocks.push(
        <h1 key={key++} className="text-headline-lg text-text-primary">
          {renderInline(line.slice(2))}
        </h1>,
      )
      continue
    }
    if (line.startsWith('> ')) {
      flushParagraph()
      blocks.push(
        <blockquote
          key={key++}
          className="rounded-lg border border-aurora-violet/40 bg-aurora-violet/10 px-4 py-3 text-body-md text-text-primary"
        >
          {renderInline(line.slice(2))}
        </blockquote>,
      )
      continue
    }
    paragraph.push(line)
  }
  flushParagraph()

  return <article className="flex flex-col gap-4">{blocks}</article>
}
