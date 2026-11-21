import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DrivingSchoolsPage } from './driving-schools';

afterEach(() => vi.restoreAllMocks());

it('searches only on submit and loads subsequent 20-result pages manually', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input) => {
      const page = new URL(String(input), 'http://localhost').searchParams.get(
        'page',
      );
      const school =
        page === '2'
          ? {
              name: 'Second School',
              url: 'https://example.test/second',
              typeLabel: 'Autorijschool',
              city: 'Rotterdam',
              province: 'Zuid-Holland',
              rating: 4.7,
              reviewCount: 20,
            }
          : {
              name: 'Rijschool Test',
              url: 'https://example.test/school',
              typeLabel: 'Autorijschool',
              city: 'Rotterdam',
              province: 'Zuid-Holland',
              rating: 4.8,
              reviewCount: 31,
              slagingspercentageRijbewijs: {
                rijbewijs: 'B',
                percentage: 52.9,
                examens: 72,
                maat: 'eerste examens',
                meetperiode: '2026',
              },
            };
      return new Response(
        JSON.stringify({
          results: [school],
          total: 21,
          page: Number(page),
          totalPages: 2,
        }),
        { status: 200 },
      );
    });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <DrivingSchoolsPage />
    </QueryClientProvider>,
  );

  fireEvent.change(screen.getByPlaceholderText(/driving school name/i), {
    target: { value: 'HERS' },
  });
  fireEvent.change(screen.getByPlaceholderText(/city, for example/i), {
    target: { value: 'Rotterdam' },
  });
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /search/i }));

  expect(await screen.findByText('Rijschool Test')).toBeInTheDocument();
  expect(screen.getByText('52.9%')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0][0])).toContain('city=Rotterdam');
  expect(String(fetchMock.mock.calls[0][0])).toContain('q=HERS');
  expect(String(fetchMock.mock.calls[0][0])).toContain('limit=20');
  expect(String(fetchMock.mock.calls[0][0])).toContain('page=1');

  fireEvent.click(screen.getByRole('button', { name: 'Load 20 more' }));
  expect(await screen.findByText('Second School')).toBeInTheDocument();
  expect(screen.getByText('Showing 2 of 21 matches')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(String(fetchMock.mock.calls[1][0])).toContain('page=2');
  expect(
    screen.queryByRole('button', { name: 'Load 20 more' }),
  ).not.toBeInTheDocument();
});
