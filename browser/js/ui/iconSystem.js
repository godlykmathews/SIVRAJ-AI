const ICON_PATHS = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  news: '<path d="M4 4h16v16H4z"/><path d="M7 8h10M7 12h10M7 16h6"/>',
  chat: '<path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-3.4-.7L4 20l1.7-3.7A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  mail: '<path d="M3 5h18v14H3z"/><path d="m3 6 9 7 9-7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>',
  bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10 21h4"/>'
};

const EMOJI_PATTERN = /[#*0-9]\uFE0F?\u20E3|[\u{1F300}-\u{1FAFF}]\uFE0F?(?:\u200D[\u{1F300}-\u{1FAFF}]\uFE0F?)?|[\u2600-\u27BF]/gu;
const BRAND_REPLACEMENTS = [
  ['RoboBook', 'Botter'], ['ROBOBOOK', 'BOTTER'],
  ['RoboNews', 'The Daily Bot'], ['ROBONEWS', 'THE DAILY BOT'],
  ['RoboForum', 'BotOverflow'], ['ROBOFORUM', 'BOTOVERFLOW'],
  ['RoboMatch', 'Pair.exe'], ['ROBOMATCH', 'PAIR.EXE'],
  ['RoboShop', 'ProbablyUseful'], ['ROBOSHOP', 'PROBABLYUSEFUL'],
  ['Facebook', 'Botter'], ['FACEBOOK', 'BOTTER'],
  ['Chrome Dome', 'definitely not chrome'], ['DefinitelyNotChrome', 'definitely not chrome']
];

export function iconMarkup(name = 'globe') {
  return `<svg class="standard-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ICON_PATHS.globe}</svg>`;
}

export function normalizeIcons(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  nodes.forEach(textNode => {
    if (!EMOJI_PATTERN.test(textNode.nodeValue)) return;
    EMOJI_PATTERN.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    textNode.nodeValue.split(EMOJI_PATTERN).forEach((part, index) => {
      if (index % 2 === 1) {
        const icon = document.createElement('span');
        icon.innerHTML = iconMarkup('globe');
        fragment.appendChild(icon.firstElementChild);
      } else if (part) {
        fragment.appendChild(document.createTextNode(part));
      }
    });
    textNode.parentNode.replaceChild(fragment, textNode);
  });
}

export function normalizeBranding(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  nodes.forEach(textNode => {
    if (textNode.parentElement?.closest('.home-container')) return;
    let value = textNode.nodeValue;
    BRAND_REPLACEMENTS.forEach(([from, to]) => { value = value.split(from).join(to); });
    textNode.nodeValue = value;
  });
}
