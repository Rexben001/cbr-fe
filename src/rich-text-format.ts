const escape = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const inline = (value: string) =>
  escape(value)
    .replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');
const decodeTitle = (value: string | undefined) => {
  try {
    return decodeURIComponent(value ?? '');
  } catch {
    return '';
  }
};

export function markdownToHTML(markdown: string) {
  const lines = markdown.replaceAll('\r', '').split('\n');
  const output: string[] = [];
  let list: '' | 'ul' | 'ol' = '';
  const close = () => {
    if (list) {
      output.push(`</${list}>`);
      list = '';
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const embeddedQuiz = line.trim().match(/^\[\[lesson-quiz:([A-Za-z0-9_-]+)\]\]$/);
    const media = line
      .trim()
      .match(
        /^\[\[media:([A-Za-z0-9_-]+)(?:\|width=(\d{1,3}))?(?:\|align=(left|center|right))?(?:\|title=([^\]|]*))?\]\]$/,
      );
    const bullet = line.match(/^[-*] (.+)$/);
    const numbered = line.match(/^\d+\. (.+)$/);
    if (embeddedQuiz) {
      close();
      output.push(`<div data-rich-lesson-quiz-id="${embeddedQuiz[1]}"></div>`);
      continue;
    }
    if (media) {
      const width = Math.min(100, Math.max(25, Number(media[2] ?? 100)));
      const align = media[3] ?? 'center';
      const title = escape(decodeTitle(media[4]));
      close();
      output.push(
        `<div data-rich-media-id="${media[1]}" data-rich-media-width="${width}" data-rich-media-align="${align}" data-rich-media-title="${title}"></div>`,
      );
      continue;
    }
    if (bullet || numbered) {
      const wanted = bullet ? 'ul' : 'ol';
      if (list !== wanted) {
        close();
        list = wanted;
        output.push(`<${wanted}>`);
      }
      output.push(`<li>${inline((bullet?.[1] ?? numbered?.[1]) || '')}</li>`);
      continue;
    }
    close();
    if (!line.trim()) {
      continue;
    }
    if (line.startsWith('### '))
      output.push(`<h3>${inline(line.slice(4))}</h3>`);
    else if (line.startsWith('## '))
      output.push(`<h2>${inline(line.slice(3))}</h2>`);
    else if (line.startsWith('# '))
      output.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (line.startsWith('> '))
      output.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`);
    else output.push(`<p>${inline(line)}</p>`);
  }
  close();
  return output.join('');
}

function nodeMarkdown(node: Node, orderedIndex = 1): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';
  const quizID = node.getAttribute('data-rich-lesson-quiz-id');
  if (quizID) return `[[lesson-quiz:${quizID}]]\n\n`;
  const mediaID = node.getAttribute('data-rich-media-id');
  if (mediaID) {
    const width = node.getAttribute('data-rich-media-width') ?? '100';
    const align = node.getAttribute('data-rich-media-align') ?? 'center';
    const title = node.getAttribute('data-rich-media-title') ?? '';
    const layout =
      width === '100' && align === 'center'
        ? ''
        : `|width=${width}|align=${align}`;
    const titlePart = title ? `|title=${encodeURIComponent(title)}` : '';
    return `[[media:${mediaID}${layout}${titlePart}]]\n\n`;
  }
  const children = Array.from(node.childNodes)
    .map((child) => nodeMarkdown(child))
    .join('');
  switch (node.tagName) {
    case 'STRONG':
    case 'B':
      return `**${children}**`;
    case 'EM':
    case 'I':
      return `_${children}_`;
    case 'A':
      return `[${children}](${node.getAttribute('href') ?? ''})`;
    case 'H1':
      return `# ${children}\n\n`;
    case 'H2':
      return `## ${children}\n\n`;
    case 'H3':
      return `### ${children}\n\n`;
    case 'P':
      return `${children}\n\n`;
    case 'BLOCKQUOTE':
      return (
        children
          .trim()
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n') + '\n\n'
      );
    case 'UL':
      return (
        Array.from(node.children)
          .map((child) => `- ${nodeMarkdown(child).trim()}\n`)
          .join('') + '\n'
      );
    case 'OL':
      return (
        Array.from(node.children)
          .map(
            (child, index) =>
              `${orderedIndex + index}. ${nodeMarkdown(child).trim()}\n`,
          )
          .join('') + '\n'
      );
    case 'LI':
      return children;
    case 'BR':
      return '\n';
    default:
      return children;
  }
}

export function htmlToMarkdown(html: string) {
  const documentNode = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(documentNode.body.childNodes)
    .map((node) => nodeMarkdown(node))
    .join('')
    .trim();
}
