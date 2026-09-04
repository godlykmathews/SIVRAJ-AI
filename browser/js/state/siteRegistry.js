export const siteRegistry = [
  { name: 'Botter', url: 'sivraj://botter', icon: 'person', description: 'A quiet place for updates and conversations.' },
  { name: 'The Daily Bot', url: 'sivraj://dailybot', icon: 'news', description: 'Technology news from the SIVRAJ Internet.' },
  { name: 'BotOverflow', url: 'sivraj://botoverflow', icon: 'chat', description: 'Questions, answers, and practical fixes.' },
  { name: 'Pair.exe', url: 'sivraj://pair', icon: 'link', description: 'Discover useful connections.' },
  { name: 'ProbablyUseful', url: 'sivraj://probablyuseful', icon: 'star', description: 'A hand-picked collection of links.' },
  { name: 'Ctrl+F', url: 'sivraj://search', icon: 'search', description: 'Search the SIVRAJ Internet.' },
  { name: 'ReplyAll', url: 'sivraj://replyall', icon: 'mail', description: 'Messages and shared threads.' }
];

const legacyUrls = {
  'sivraj://robobook': { name: 'BotBook', icon: 'person' },
  'sivraj://robonews': { name: '404 News', icon: 'news' },
  'sivraj://roboforum': { name: 'BotOverflow', icon: 'chat' },
  'sivraj://robomatch': { name: 'Neuralinked', icon: 'link' },
  'sivraj://roboshop': { name: 'Consume.exe', icon: 'star' }
};

export function getSiteByUrl(url) {
  const cleanUrl = String(url || '').split('?')[0];
  return siteRegistry.find(site => site.url === cleanUrl) || (legacyUrls[cleanUrl] ? {
    ...legacyUrls[cleanUrl],
    url: cleanUrl
  } : null);
}
