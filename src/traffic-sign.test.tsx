import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { referencedTrafficSignCodes, TrafficSign } from './traffic-sign';

describe('TrafficSign', () => {
  it('resolves official sign files from code and series', () => {
    render(<TrafficSign code="B1" size="card" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/traffic-signs/B/B1.svg');
  });

  it('keeps the code visible if the asset is missing or invalid', () => {
    const { rerender } = render(<TrafficSign code="E8b" />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('E8b')).toBeInTheDocument();
    rerender(<TrafficSign code="not-a-sign" />);
    expect(screen.getByText('not-a-sign')).toBeInTheDocument();
  });

  it('only resolves codes in an explicit traffic-sign reference', () => {
    expect(referencedTrafficSignCodes('What must a driver do at traffic sign B7 (STOP)?')).toEqual(['B7']);
    expect(referencedTrafficSignCodes('Lesson B7 is next.')).toEqual([]);
  });
});
