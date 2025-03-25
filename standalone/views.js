const { connect } = require("puppeteer-real-browser");
const fs = require("fs");

// const username = "hestonjames"; //username without the " @ " prefix

async function views(username) {
  const { browser } = await connect({
    defaultViewport: null,
    headless: false,

    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-notifications",
      "--disable-geolocation",
    ],

    customConfig: {},

    turnstile: true,

    connectOption: {
      defaultViewport: null,
    },
    disableXvfb: false,
    ignoreAllFlags: false,
    // proxy:{
    //     host:'<proxy-host>',
    //     port:'<proxy-port>',
    //     username:'<proxy-username>',
    //     password:'<proxy-password>'
    // }
  });
  const baseLink = "https://www.tiktok.com/";
  const userProfile = baseLink + "@" + username;
  try {
    const cookieJson = fs.readFileSync("cookies.json", "utf-8");
    const cookies = JSON.parse(cookieJson);
    await browser.setCookie(...cookies);
    const page = await browser.newPage();
    //visit the url
    await page.goto(userProfile, { waitUntil: "networkidle2" });
    //// console.log("page loaded");
    //wait for everything to load
    await new Promise((res) => setTimeout(res, 1500));
    // console.log("getting name");

    const userInfo = await page.evaluate(() => {
      const getText = (selector) => {
        const element = document.querySelector(`${selector}`);
        return element ? element.textContent.trim() : null;
      };

      return {
        username: getText('h1[data-e2e="user-title"]'),
        subtitle: getText('h2[data-e2e="user-subtitle"]'),
      };
    });

    console.log(userInfo);

    // console.log("getting info");

    const stats = await page.evaluate(() => {
      const getCount = (selector) => {
        const element = document.querySelector(`strong[${selector}]`);
        return element ? element.textContent.trim() : null;
      };

      return {
        following: getCount('data-e2e="following-count"'),
        followers: getCount('data-e2e="followers-count"'),
        likes: getCount('data-e2e="likes-count"'),
      };
    });
    console.log(stats);
    //now tap the popoular section
    // console.log("clicking popular ");
    const popularBtn = await page.waitForSelector(
      'button[aria-label="Popular"]'
    );
    //
    await popularBtn.click();
    // console.log("clicked popular button");

    //now scroll
    // Defining a function to scroll to the bottom of the page
    const scrollPageToBottom = async () => {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise((res) => setTimeout(res, 2000));
    };

    // Scrolling in a loop until a certain condition is met
    let previousHeight = 0;
    while (true) {
      await scrollPageToBottom();
      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === previousHeight) {
        break;
      }
      previousHeight = newHeight;
    }

    //start scraping
    const results = await page.evaluate(() => {
      const data = [];
      const posts = document.querySelectorAll('div[data-e2e="user-post-item"]');

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const linkElement = post.querySelector("a");
        const viewsElement = post.querySelector('[data-e2e="video-views"]');

        data.push({
          link: linkElement ? linkElement.href : null,
          views: viewsElement ? viewsElement.textContent.trim() : null,
        });
      }
      console.log(data);
      return data;
    });

    //// console.log(resuts);
    const data = {
      userInfo,
      stats,
      results,
    };

    return data;
    // fs.writeFileSync(`${username}.json`, JSON.stringify(data, null, 2));
  } catch (error) {
    // console.log(error);
  } finally {
    browser.close();
  }
}

// run(username);
module.exports = views;
