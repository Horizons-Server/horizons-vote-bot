export type Ping = `<@${string}>`;
export type Timestamp = `<t:${number}:R>`;
export type DevVoteReply = `___Development Vote___
**Name**: ${string}
**Description**: ${string}
**Coordinates** ${number}, ${number}
**Proposed By**: ${Ping}
**Proposal Type**: ${string}
**First Deadline**: ${Timestamp}
Press ✋ to object to this development.`;
export type DevVoteRenew =
  `Vote "${string}" by ${Ping} has been extended due to objections. The new deadline is ${Timestamp}. This vote has been renewed ${number} times.`;
