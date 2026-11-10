import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LessonContent } from './lesson-content';

describe('LessonContent', () => {
  it('renders headings, paragraphs, lists, and emphasis without HTML injection', () => {
    render(
      <LessonContent
        content={
          '# Priority\n\n## Rule\nAlways **look**.\n- Stop\n<script>unsafe</script>'
        }
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Priority' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rule' })).toBeInTheDocument();
    expect(screen.getByText('look').tagName).toBe('STRONG');
    expect(screen.queryByRole('script')).not.toBeInTheDocument();
    expect(screen.getByText('<script>unsafe</script>')).toBeInTheDocument();
  });
});
