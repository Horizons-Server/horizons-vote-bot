import { RawJson } from "./RawJson.js";

export interface Proposal {
  uuid: string;
  name: string;
  xCord: number;
  yCord: number;
  proposedBy: string;
  type: string;
  description: string;
  imageLink?: string;
  threadLink: string;
  dateProposed: number;
  actionDate?: number;
  objections?: string[];
  numExtensions?: number;
  otherJson?: RawJson;
}
