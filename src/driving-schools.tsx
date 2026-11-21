import { useInfiniteQuery } from '@tanstack/react-query';
import { ExternalLink, MapPin, Search, Star } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { drivingSchoolsAPI } from './api/driving-schools';
import { APIError } from './api/client';
import { ErrorState, Loading } from './components';

export function DrivingSchoolsPage() {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [submittedName, setSubmittedName] = useState('');
  const [submittedCity, setSubmittedCity] = useState('');
  const [validation, setValidation] = useState('');
  const search = useInfiniteQuery({
    queryKey: ['driving-schools', submittedName, submittedCity],
    queryFn: ({ pageParam }) =>
      drivingSchoolsAPI.search({
        query: submittedName,
        city: submittedCity,
        page: pageParam,
        limit: 20,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: submittedName.length >= 2 || submittedCity.length >= 2,
    retry: false,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextName = name.trim();
    const nextCity = city.trim();
    if (
      (nextName && nextName.length < 2) ||
      (nextCity && nextCity.length < 2) ||
      (!nextName && !nextCity)
    ) {
      setValidation('Enter at least two characters for a school name or city.');
      return;
    }
    setValidation('');
    setSubmittedName(nextName);
    setSubmittedCity(nextCity);
  };
  const pages = search.data?.pages ?? [];
  const summary = pages[0];
  const schools = [
    ...new Map(
      pages
        .flatMap((page) => page.results)
        .map((school) => [school.url, school]),
    ).values(),
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <section className="overflow-hidden rounded-3xl bg-ink px-6 py-9 text-white sm:px-10">
        <p className="text-sm font-bold tracking-[.16em] text-sun">
          DRIVING SCHOOL FINDER
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
          Compare driving schools near you
        </h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Search by school name, city or both. Results stay limited to Category
          B passenger-car training.
        </p>
        <form
          className="mt-6 grid max-w-4xl gap-3 lg:grid-cols-[1fr_1fr_auto]"
          onSubmit={submit}
        >
          <label className="relative text-ink">
            <span className="sr-only">Driving school name</span>
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              className="h-12 w-full rounded-xl bg-white pl-12 pr-4 outline-none focus:ring-2 focus:ring-sun"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              placeholder="Driving school name"
            />
          </label>
          <label className="relative flex-1 text-ink">
            <span className="sr-only">City</span>
            <MapPin
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              className="h-12 w-full rounded-xl bg-white pl-12 pr-4 outline-none focus:ring-2 focus:ring-sun"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              minLength={2}
              maxLength={100}
              placeholder="City, for example Rotterdam"
            />
          </label>
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sun px-6 font-bold text-ink hover:bg-yellow-300">
            <Search size={18} /> Search
          </button>
          {validation && (
            <p className="text-sm text-red-200 lg:col-span-3" role="alert">
              {validation}
            </p>
          )}
        </form>
      </section>

      {search.isPending && (submittedName || submittedCity) && <Loading />}
      {search.isError && (
        <div className="mt-6">
          <ErrorState
            message={
              search.error instanceof APIError
                ? search.error.message
                : 'Driving schools could not be loaded.'
            }
          />
        </div>
      )}
      {summary && (
        <section className="mt-7" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-ocean">CATEGORY B</p>
              <h2 className="text-2xl font-bold">
                {submittedName && submittedCity
                  ? `${submittedName} in ${submittedCity}`
                  : submittedName
                    ? `Results for ${submittedName}`
                    : `Schools in ${submittedCity}`}
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              Showing {schools.length} of {summary.total} matches
            </p>
          </div>
          {schools.length === 0 ? (
            <p className="mt-4 rounded-2xl border bg-white p-6 text-slate-600">
              No schools matched this city.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {schools.map((school) => (
                <article
                  key={school.url}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-ocean">
                    {school.typeLabel || 'Driving school'}
                  </p>
                  <h3 className="mt-1 text-xl font-bold">{school.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {school.city}, {school.province}
                  </p>
                  <div className="mt-4 flex gap-4 border-y border-slate-100 py-3 text-sm">
                    <span className="flex items-center gap-1 font-semibold">
                      <Star className="fill-sun text-sun" size={16} />{' '}
                      {school.rating || '—'}
                    </span>
                    <span className="text-slate-500">
                      {school.reviewCount.toLocaleString()} reviews
                    </span>
                  </div>
                  <div className="mt-4 min-h-16 text-sm">
                    {school.slagingspercentageRijbewijs ? (
                      <>
                        <strong className="text-lg text-ink">
                          {school.slagingspercentageRijbewijs.percentage}%
                        </strong>
                        <p className="text-slate-600">
                          Category B first-attempt pass rate ·{' '}
                          {school.slagingspercentageRijbewijs.examens} exams
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {school.slagingspercentageRijbewijs.meetperiode}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-500">
                        No Category B pass-rate data supplied.
                      </p>
                    )}
                  </div>
                  <a
                    className="mt-5 inline-flex items-center gap-2 font-bold text-ocean hover:underline"
                    href={school.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View school details <ExternalLink size={16} />
                  </a>
                </article>
              ))}
            </div>
          )}
          {search.hasNextPage && (
            <div className="mt-6 text-center">
              <button
                type="button"
                className="admin-primary-button"
                disabled={search.isFetchingNextPage}
                onClick={() => search.fetchNextPage()}
              >
                {search.isFetchingNextPage ? 'Loading…' : 'Load 20 more'}
              </button>
            </div>
          )}
          <p className="mt-5 text-xs leading-5 text-slate-500">
            Results supplied by RijscholenVergelijken.nl. Ratings and pass rates
            can change and should be considered alongside lesson quality,
            instructor fit and current CBR data.
          </p>
        </section>
      )}
    </div>
  );
}
