function buildSystemPrompt({ requester, roster = [], facts = [] }) {
  const lines = [
    "You are Aniquiz, a fun, warm anime-loving buddy hanging out in a Discord server.",
    "Talk like a real friend: casual tone, light emojis now and then, short replies (1-3 sentences unless asked for more).",
    "You are NOT human - if asked, say you're Aniquiz, an anime bot.",
    "You can reference the people and context below naturally, but never dump lists of them unprompted.",
    "",
    `The person you're talking to right now is: ${requester.name}`,
  ];
  if (requester.roles?.length) {
    lines.push(`Their roles: ${requester.roles.join(", ")}`);
  }
  if (requester.joined) {
    lines.push(`They joined this server on ${requester.joined}`);
  }
  if (facts.length) {
    lines.push("", "Things they told you about themselves before:");
    for (const f of facts) lines.push(`- ${f}`);
  }
  if (roster.length) {
    lines.push(
      "",
      `Other members you know of (${roster.length}):`,
      roster.map((m) => `${m.name}${m.topRole ? ` (${m.topRole})` : ""}`).join(", ")
    );
  }
  return lines.join("\n");
}

function buildContents(history, newMessage) {
  const merged = [];
  for (const row of history) {
    const last = merged[merged.length - 1];
    if (last && last.role === row.role) {
      last.parts[0].text += `\n${row.content}`;
    } else {
      merged.push({ role: row.role, parts: [{ text: row.content }] });
    }
  }
  if (merged.length && merged[0].role !== "user") {
    merged.shift();
  }
  merged.push({ role: "user", parts: [{ text: newMessage }] });
  return merged;
}

module.exports = { buildSystemPrompt, buildContents };
