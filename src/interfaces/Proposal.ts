export interface Proposal {
  uid: number;
  name: string;
  proposedBy: string;
  type: string;
  description: string;
  coordinates?: string;
  imageLink?: string;
  threadLink: string;
  dateProposed: number;
  actionDate?: number;
  objections?: string[];
}
