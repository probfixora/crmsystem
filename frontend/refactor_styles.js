const fs = require('fs');
let c = fs.readFileSync('src/components/QuotationForm.js', 'utf8');

c = c.replace(/style=\{S\.inp\}/g, 'className="q-inp"');
c = c.replace(/style=\{S\.sel\}/g, 'className="q-sel"');
c = c.replace(/style=\{S\.ro\}/g, 'className="q-ro"');
c = c.replace(/style=\{S\.card\}/g, 'className="q-card"');
c = c.replace(/style=\{S\.g2\}/g, 'className="q-g2"');
c = c.replace(/style=\{S\.g3\}/g, 'className="q-g3"');
c = c.replace(/style=\{S\.info\}/g, 'className="q-info"');
c = c.replace(/style=\{\{\.\.\.S\.g2, marginBottom:14\}\}/g, 'className="q-g2 q-mb"');
c = c.replace(/style=\{\{\.\.\.S\.g2, marginTop:14\}\}/g, 'className="q-g2 q-mb"');
c = c.replace(/style=\{S\.page\}/g, 'className="quotation-page"');
c = c.replace(/style=\{S\.hdr\}/g, 'className="quotation-hdr"');
c = c.replace(/<div style=\{S\.sh\}>/g, '<div className="q-sh">');
c = c.replace(/style=\{\{\.\.\.S\.inp,fontSize:17,fontWeight:700,color:'#16a34a'\}\}/g, 'className="q-inp q-price"');

fs.writeFileSync('src/components/QuotationForm.js', c);
