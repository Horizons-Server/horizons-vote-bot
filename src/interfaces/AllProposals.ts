import { Proposal } from "./proposal";

export interface AllProposals {
  approved: Proposal[];
  denied: Proposal[];
  inProgress: Proposal[];
  all: Proposal[];
}
