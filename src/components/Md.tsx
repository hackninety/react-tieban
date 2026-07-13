import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/** markdown 渲染（marked + DOMPurify 消毒） */
export function Md({ src }: { src: string }) {
  const html = useMemo(
    () => DOMPurify.sanitize(marked.parse(src, { async: false }) as string),
    [src],
  );
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
}
