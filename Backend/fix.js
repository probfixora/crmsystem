const fs = require('fs');
const path = 'supabase/functions/workflow/index.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.split('\\${').join('${');
c = c.split('\\`').join('`');

fs.writeFileSync(path, c);
