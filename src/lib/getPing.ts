import type { Ping } from "../types/discord.js";

export const getPing = (user: string): Ping => `<@${user}>`;
