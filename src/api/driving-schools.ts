import { request } from './client';

export interface DrivingSchoolPassRate {
  rijbewijs: string;
  percentage: number;
  examens: number;
  maat: string;
  meetperiode: string;
}

export interface DrivingSchool {
  name: string;
  url: string;
  typeLabel: string;
  city: string;
  province: string;
  rating: number;
  reviewCount: number;
  slagingspercentageRijbewijs?: DrivingSchoolPassRate | null;
}

export interface DrivingSchoolSearchResult {
  results: DrivingSchool[];
  total: number;
  page: number;
  totalPages: number;
}

export const drivingSchoolsAPI = {
  search: ({
    query,
    city,
    page = 1,
    limit = 20,
  }: {
    query?: string;
    city?: string;
    page?: number;
    limit?: number;
  }) => {
    const parameters = new URLSearchParams({
      limit: String(limit),
      page: String(page),
    });
    if (query?.trim()) parameters.set('q', query.trim());
    if (city?.trim()) parameters.set('city', city.trim());
    return request<DrivingSchoolSearchResult>(
      `/api/v1/driving-schools?${parameters}`,
    );
  },
};
