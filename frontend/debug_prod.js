const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });
  page.on('response', response => {
    if (response.url().includes('functions/v1/admin')) {
      console.log('ADMIN EDGE RESPONSE:', response.status(), response.url());
      response.text().then(t => console.log('ADMIN EDGE BODY:', t)).catch(e => console.error('Could not read body'));
    }
  });

  console.log('Navigating to login...');
  await page.goto('https://crm.probfixora.co.in/login');
  
  await page.type('input[type="email"]', 'probfixora@gmail.com');
  await page.type('input[type="password"]', 'probfixora.1$');
  await page.click('button[type="submit"]');

  console.log('Waiting for navigation to admin dashboard...');
  await page.waitForNavigation();
  console.log('Logged in. Current URL:', page.url());

  console.log('Navigating to /users...');
  await page.goto('https://crm.probfixora.co.in/users');
  
  await new Promise(r => setTimeout(r, 5000));
  console.log('Done.');
  
  await browser.close();
})();
