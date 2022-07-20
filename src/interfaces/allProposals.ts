import { Proposal } from "./proposal.js";

export interface AllProposals {
  approved: Proposal[];
  denied: Proposal[];
  inProgress: Proposal[];
  all: Proposal[];
}
