export type Category = 'LAB' | 'PEG' | 'UNI' | 'EDU';

export interface Employee {
  id: string;
  name: string;
  title: string;
  deptCode: string;
  avatar: string;
  year: 2023 | 2024 | 2025;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  categories: Record<Category, number>;
  total: number;
}
