import { readFileSync } from 'fs';

const mock = readFileSync('src/lib/mock-data.ts', 'utf8');
const icons = readFileSync('src/lib/icons.ts', 'utf8');

const mockIcons = [...mock.matchAll(/A\("(.+?)"\)/g)].map(m => m[1]);
const iconFiles = [...icons.matchAll(/"(.+\.png)"/g)].map(m => m[1]);

console.log('Icons in mock-data but NOT in ICON_FILES:');
mockIcons.filter(i => !iconFiles.includes(i)).forEach(i => console.log('  ' + i));

console.log('\nIcons in ICON_FILES but NOT in mock-data:');
iconFiles.filter(i => !mockIcons.includes(i)).forEach(i => console.log('  ' + i));

console.log('\nAll mock icons:');
mockIcons.forEach(i => console.log('  ' + i));
