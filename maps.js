const puppeteer = require('puppeteer');

(async () => {
  const url = "https://www.google.com/maps/place/Sagar+Stationers/@26.4963403,80.3134521,869m/data=!3m2!1e3!4b1!4m6!3m5!1s0x399c385b73ce767b:0x5e3ad9471c8aac91!8m2!3d26.4963403!4d80.3134521!16s%2Fg%2F124yn9shd?entry=ttu&g_ep=EgoyMDI1MDgwNS4wIKXMDSoASAFQAw%3D%3D";

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Wait for rating element to appear
  await page.waitForSelector('div.F7nice'); // rating container
  
  // Extract details
  const data = await page.evaluate(() => {
    const name = document.querySelector('h1.DUwDvf')?.innerText || null;
    const rating = document.querySelector('div.F7nice')?.innerText || null;
    const reviews = document.querySelector('span.UY7F9')?.innerText || null;
    const address = document.querySelector('button[data-item-id="address"] div.Io6YTe')?.innerText || null;
    
    return { name, rating, reviews, address };
  });

  console.log(data);

  await browser.close();
})();
