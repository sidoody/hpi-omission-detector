// src/types/index.ts
export type OmissionType = 
  'Recent medical events' | 
  'Omission of Symptoms' | 
  'Medication Omission' | 
  'Symptom details and characteristics' | 
  'People involved in interaction' | 
  'Documentation style';

export type OmissionSignificance = 'Critical' | 'High' | 'Moderate' | 'Minor';

// Mapping between omission types and their significance
export const omissionTypeSignificanceMap: Record<OmissionType, OmissionSignificance> = {
  'Recent medical events': 'Critical',
  'Omission of Symptoms': 'Critical',
  'Medication Omission': 'Critical',
  'Symptom details and characteristics': 'High',
  'People involved in interaction': 'Moderate',
  'Documentation style': 'Minor'
};

export interface Omission {
  type: OmissionType;
  description: string;
  evidence: string;
  recommendation: string;
}

export interface AnalysisResult {
  summary: string;
  omissions: Omission[];
  assessment: string;
}
  
export interface AnalysisRequest {
  transcript: string;
  hpi: string;
}