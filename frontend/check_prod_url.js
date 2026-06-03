const https = require('https');
https.get('https://crm.probfixora.co.in', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/src="(\/static\/js\/main\.[^"]+\.js)"/);
    if (match) {
      const jsUrl = 'https://crm.probfixora.co.in' + match[1];
      console.log('JS URL:', jsUrl);
      https.get(jsUrl, (jsRes) => {
        let jsData = '';
        jsRes.on('data', chunk => jsData += chunk);
        jsRes.on('end', () => {
          const supabaseMatch = jsData.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
          console.log('Supabase URL in production:', supabaseMatch ? supabaseMatch[0] : 'Not found');
        });
      });
    } else {
      console.log('Main JS not found in HTML');
    }
  });
});
