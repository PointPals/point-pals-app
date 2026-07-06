const iconFiles = await import('fs').then(m => m.readFileSync('src/lib/icons.ts', 'utf8'));
const base = 'https://tcpbvcgvtwrqsrzerwwr.supabase.co/storage/v1/object/public/assets/';
const matches = [...iconFiles.matchAll(/"(.+?\.png)"/g)].map(m => m[1]);
console.log('being-helpful.png in ICON_FILES?', matches.includes('being-helpful.png'));
console.log('helped-without-being-asked.png in ICON_FILES?', matches.includes('helped-without-being-asked.png'));
console.log('including-others.png in ICON_FILES?', matches.includes('including-others.png'));
