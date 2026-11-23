/* Name-based prior-event exclusion matching, independent of the UI. */
function previousMatches(current, previous) {
  const exclusions = current.names.map(() => []);
  const matched = [], unmatched = [];
  const normalize = name => name.trim().toLocaleLowerCase('en-US');
  if (!previous || !Array.isArray(previous.draw) || previous.draw.length !== previous.names.length) {
    return {exclusions, matched, unmatched: current.names.map(giver => ({giver, reason: 'No completed previous drawing'}))};
  }
  const oldNames = new Map(previous.names.map((name, i) => [normalize(name), i]));
  const nowNames = new Map(current.names.map((name, i) => [normalize(name), i]));
  current.names.forEach((name, i) => {
    const oldIndex = oldNames.get(normalize(name));
    if (oldIndex === undefined) {
      unmatched.push({giver: name, reason: 'Not in the previous event'});
      return;
    }
    const oldRecipientIndex = previous.draw[oldIndex];
    const oldRecipient = previous.names[oldRecipientIndex];
    const newRecipientIndex = typeof oldRecipient === 'string' ? nowNames.get(normalize(oldRecipient)) : undefined;
    if (newRecipientIndex === undefined) {
      unmatched.push({giver: name, recipient: oldRecipient, reason: 'Previous recipient is not in this event'});
      return;
    }
    exclusions[i].push(newRecipientIndex);
    matched.push({giver: name, recipient: current.names[newRecipientIndex]});
  });
  return {exclusions, matched, unmatched};
}
if (typeof module !== 'undefined') module.exports = {previousMatches};
