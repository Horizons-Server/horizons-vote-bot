import { Timestamp } from "types/discord";

export const getTimestamp = (time: Date): Timestamp =>
  `<t:${Math.floor(time.getTime() / 1000)}:R>`;
