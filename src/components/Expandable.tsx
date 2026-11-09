import type { ReactNode } from 'react'

type ExpandableProps = {
  title: string
  summary?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/** Disclosure section with an optional collapsed summary line. */
export function Expandable({
  title,
  summary,
  open,
  onToggle,
  children,
  className = '',
  bodyClassName = '',
}: ExpandableProps) {
  return (
    <div className={`expandable ${open ? 'is-open' : ''} ${className}`.trim()}>
      <button
        type="button"
        className="expandable-toggle"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="expandable-toggle-main">
          <span className="expandable-title">{title}</span>
          {!open && summary ? (
            <span className="expandable-summary">{summary}</span>
          ) : null}
        </span>
        <span className="expandable-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className={`expandable-body ${bodyClassName}`.trim()}>{children}</div>
      ) : null}
    </div>
  )
}
