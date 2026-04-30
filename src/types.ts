export type DocStatus = 'SOLICITADO' | 'ENVIADO';

export interface CandidateDocument {
  id: string;
  type: string;
  status: DocStatus;
  requestedDate: Date | null;
  sentDate: Date | null;
}

export interface Candidate {
  id: string;
  name: string;
  synthesis: string;
  meetingLink: string;
  status: 'Active' | 'Archive';
  createdAt: Date;
  updatedAt: Date;
}
