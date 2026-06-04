const fs = require('fs');
let c = fs.readFileSync('supabase/functions/workflow/index.ts', 'utf8');
c = c.replace(/\\\$\\\{/g, '${');
c = c.replace(/\\\`/g, '`');
fs.writeFileSync('supabase/functions/workflow/index.ts', c);
