const fs = require('fs');
const logo = fs.readFileSync('../frontend/public/logo.png', 'base64');
const logo1 = fs.readFileSync('../frontend/public/logo1.png', 'base64');
fs.writeFileSync('supabase/functions/quotation/logoBase64.ts', 'export const logoBase64 = "' + logo + '";\nexport const logoIconBase64 = "' + logo + '";\n');
