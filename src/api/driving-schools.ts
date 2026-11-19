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
  search: (city: string, page = 1, limit = 20) =>
    request<DrivingSchoolSearchResult>(
      `/api/v1/driving-schools?${new URLSearchParams({ city, limit: String(limit), page: String(page) })}`,
    ),
};
