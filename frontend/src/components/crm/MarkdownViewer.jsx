import React from 'react';
import Markdown from 'react-markdown';

/**
 * Renders markdown with CRM-compatible typography.
 * Pass `printSafe` for light-on-white styles (PDF export clone).
 */
const MarkdownViewer = ({ markdown, className = '', printSafe = false }) => {
  if (!markdown) return null;

  return (
    <div className={`markdown-viewer ${printSafe ? 'markdown-viewer--print' : ''} ${className}`}>
      <Markdown
        components={{
          a({ href, children, ...props }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );
};

export default MarkdownViewer;
