const { connect } = require("puppeteer-real-browser");
const fs = require("fs");
const exportToExcel = require("./excel.js");

//scraper controls
const scrollDelay = 3000; // in milliseconds
const usernames = ["wowgreatplace", "adilet.sw"];

//file controls
const exportConfig = {
  json: true,
  excel: true,
};

async function run(username, speed = 25) {
  if (!exportConfig.excel && !exportConfig.json) {
    console.warn(`Both export format are set to false`);
    console.warn(`Select atleast one export format`);
    return;
  }
  const { browser } = await connect({
    defaultViewport: null,
    headless: false,

    args: [
      // "--no-sandbox",
      // "--disable-setuid-sandbox",
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
    await new Promise((res) => setTimeout(res, 2000));

    //now scroll
    // Defining a function to scroll to the bottom of the page
    const scrollPageToBottom = async () => {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise((res) => setTimeout(res, scrollDelay));
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
    const viewsData = {
      userInfo,
      stats,
      results,
    };

    // return data;

    //here ends views code

    const videos = await page.$$('div[data-e2e="user-post-item-list"] > div');
    if (videos.length > 0) {
      await videos[videos.length - 1].click(); // Click the first video
    } else {
      console.error("No videos found!");
    }
    // console.log("clicked the last vid");
    await new Promise((res) => setTimeout(res, 2000));
    //and then wait for an arbiturary value

    let nextBtn = await page.waitForSelector('button[data-e2e="arrow-left"]');

    const engagement = [];

    while (nextBtn) {
      nextBtn = await page.waitForSelector('button[data-e2e="arrow-left"]');
      await new Promise((res) => setTimeout(res, speed));
      const videoInfo = await page.evaluate(() => {
        const getText = (selector) => {
          const element = document.querySelector(`${selector}`);
          return element ? element.textContent.trim() : null;
        };
        const getCleanLink = (selector) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          return element.textContent.trim().split("?")[0]; // Remove everything after '?'
        };

        const getDate = (selector) => {
          const spans = document.querySelectorAll(selector);
          return spans.length >= 3 ? spans[2].textContent.trim() : null;
        };

        return {
          likes: getText('strong[data-e2e="browse-like-count"]'),
          comments: getText('strong[data-e2e="browse-comment-count"]'),
          saves: getText('strong[data-e2e="undefined-count"]'),
          link: getCleanLink('p[data-e2e="browse-video-link"]'),
          uploadDate: getDate('span[data-e2e="browser-nickname"] span'),
        };
      });

      console.log(videoInfo);

      engagement.push(videoInfo);

      const isDisabled = await page.evaluate(() => {
        const btn = document.querySelector('button[data-e2e="arrow-left"]');
        return btn ? btn.disabled : true;
      });

      if (isDisabled) break; // Stop if the button is disabled

      await page.keyboard.press("ArrowUp");
    }

    // here starts merging code
    const viewsObj = viewsData.results;

    const merged = viewsObj.map((result) => {
      const match = engagement.find((e) => e.link === result.link);
      return match ? { ...result, ...match } : result;
    });

    const final = {
      userInfo: viewsData.userInfo,
      stats: viewsData.stats,
      results: merged,
    };

    //convert json/excel into file
    if (exportConfig.json) {
      fs.writeFile(
        `${username}.json`,
        JSON.stringify(final, null, 2),
        "utf8",
        (err) => {
          if (err) {
            console.error(`Error writing ${username}.json:`, err);
          } else {
            console.log(`✅ Merged data saved to ${username}.json`);
          }
        }
      );
    }
    if (exportConfig.excel) {
      exportToExcel(final, username);
    }
    const newCookies = await browser.cookies();
    fs.writeFileSync("cookies.json", JSON.stringify(newCookies, null, 2));
  } catch (error) {
    console.log(error);
  } finally {
    browser.close();
  }
}

// run(username);

async function runUsernames(usernames) {
  for (const username of usernames) {
    console.log(`Scraping data for: ${username}`);
    await run(username); // Run the function for each username
  }
}

runUsernames(usernames);
