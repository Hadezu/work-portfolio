import {spawn} from 'node:child_process';
import path from 'node:path';
const [tool,...args]=process.argv.slice(2);
const entries={vite:'vite/bin/vite.js',wrangler:'wrangler/bin/wrangler.js'};
if(!entries[tool])throw new Error('Unknown local tool');
const child=spawn(process.execPath,[path.resolve('node_modules',entries[tool]),...args],{stdio:'inherit',env:{...process.env,VITE_LAB_RUNTIME:'native',WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:path.resolve('.local-logs/wrangler.log')}});
child.on('exit',code=>process.exit(code??1));
