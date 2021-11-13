import { Proposal } from "./Proposal";

export interface AllProposals {
  approved: Proposal[];
  denied: Proposal[];
  inProgress: Proposal[];
  all: Proposal[];
}
