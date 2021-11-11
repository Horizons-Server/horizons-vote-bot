import type { Ping } from "types/discord";

export const getPing = (user: string): Ping => `<@${user}>`;
