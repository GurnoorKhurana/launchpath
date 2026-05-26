export interface RoadmapPath {
  title: string;
  timeline: string;
  steps: string[];
  certifications: string[];
  realistic_salary_range_cad: string;
}

export interface Roadmap {
  paths: RoadmapPath[];
}
