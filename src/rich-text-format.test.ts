import { describe, expect, it } from 'vitest';
import { htmlToMarkdown, markdownToHTML } from './rich-text-format';

describe('rich text conversion', () => {
  it('round-trips supported formatting', () => {
    const markdown =
      '# Priority\n\nUse **extra care** and _look right_.\n\n- Cars\n- Cyclists\n\n[Official rule](https://wetten.overheid.nl)';
    const html = markdownToHTML(markdown);
    expect(html).toContain('<h1>Priority</h1>');
    expect(html).toContain('<strong>extra care</strong>');
    expect(htmlToMarkdown(html)).toBe(markdown);
  });

  it('escapes stored HTML instead of executing it', () => {
    expect(markdownToHTML('<img src=x onerror=alert(1)>')).toContain('&lt;img');
    expect(markdownToHTML('<img src=x onerror=alert(1)>')).not.toContain(
      '<img',
    );
  });

  it('round-trips embedded media references without storing signed URLs', () => {
    const markdown =
      'Watch the intersection carefully.\n\n[[media:media_123]]\n\nWho has priority?';
    const html = markdownToHTML(markdown);

    expect(html).toContain('data-rich-media-id="media_123"');
    expect(htmlToMarkdown(html)).toBe(markdown);
  });

  it('preserves media width and alignment', () => {
    const markdown =
      '[[media:media_123|width=55|align=right|title=Priority%20from%20the%20right]]';
    const html = markdownToHTML(markdown);

    expect(html).toContain('data-rich-media-width="55"');
    expect(html).toContain('data-rich-media-align="right"');
    expect(html).toContain('data-rich-media-title="Priority from the right"');
    expect(htmlToMarkdown(html)).toBe(markdown);
  });

  it('round-trips an embedded lesson quiz reference', () => {
    const markdown = 'Read this first.\n\n[[lesson-quiz:priority-check]]\n\nContinue learning.';
    const html = markdownToHTML(markdown);

    expect(html).toContain('data-rich-lesson-quiz-id="priority-check"');
    expect(htmlToMarkdown(html)).toBe(markdown);
  });
});
