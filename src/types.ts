export interface CandidateDocument {
  id: string;
  type: string;
  sentDate: Date | null;
  sentStatus: boolean | null;
  returnedDate: Date | null;
  returnedStatus: boolean | null;
  legalDate: Date | null;
  legalStatus: boolean | null;
  updatedAt: Date;
}

export interface Candidate {
  id: string;
  name: string;
  synthesis: string;
  meetingLink: string;
  status: 'Active' | 'Archive';
  boardStatus: boolean | null;
  paymentDate: Date | null;
  paymentValue: string;
  paymentStatus: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}
