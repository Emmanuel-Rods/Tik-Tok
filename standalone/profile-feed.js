const { connect } = require("puppeteer-real-browser");
const fs = require("fs");

//const username = "hestonjames"; //username without the " @ " prefix
async function extractData(username, speed = 2000) {
  const { browser } = await connect({
    defaultViewport: null,
    headless: false,

    args: [
      //   "--no-sandbox",
      //   "--disable-setuid-sandbox",
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
  const cookieJson = fs.readFileSync("cookies.json", "utf-8");
  const cookies = JSON.parse(cookieJson);
  await browser.setCookie(...cookies);
  const page = await browser.newPage();
  const baseLink = "https://www.tiktok.com/";
  const userProfile = baseLink + "@" + username;
  try {
    //visit the url
    await page.goto(userProfile, { waitUntil: "networkidle2" });
    console.log("page loaded");
    //wait for everything to load
    await new Promise((res) => setTimeout(res, 2000));
    // console.log("getting name");
    //now tap the popoular section
    console.log("clicking popular ");
    const popularBtn = await page.waitForSelector(
      'button[aria-label="Popular"]'
    );
    //
    await popularBtn.click();

    //then wait and see if the videos are loaded or not

    const creatorPost = await page.waitForSelector(
      'div[data-e2e="user-post-item-list"]'
    );
    //then click it
    //REVERSE

    const scrollPageToBottom = async () => {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise((res) => setTimeout(res, 2500));
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

    const videos = await page.$$('div[data-e2e="user-post-item-list"] > div');
    if (videos.length > 0) {
      await videos[videos.length - 1].click(); // Click the first video
    } else {
      console.error("No videos found!");
    }
    console.log("clicked the last vid");
    await new Promise((res) => setTimeout(res, 2000));
    //and then wait for an arbiturary value

    let nextBtn = await page.waitForSelector('button[data-e2e="arrow-left"]');

    const data = [];

    // await page.evaluate(() => {
    //   Object.defineProperty(navigator, "webdriver", { get: () => false });
    // });
    // await page.mouse.move(0, 0);

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
          comment: getText('strong[data-e2e="browse-comment-count"]'),
          shares: getText('strong[data-e2e="undefined-count"]'),
          link: getCleanLink('p[data-e2e="browse-video-link"]'),
          uploadDate: getDate('span[data-e2e="browser-nickname"] span'),
        };
      });

      console.log(videoInfo);

      data.push(videoInfo);

      const isDisabled = await page.evaluate(() => {
        const btn = document.querySelector('button[data-e2e="arrow-left"]');
        return btn ? btn.disabled : true;
      });

      if (isDisabled) break; // Stop if the button is disabled

      // nextBtn.click();
      // await page.mouse.wheel({ deltaY: 500 }); // Scrolls down by 500 pixels
      await page.keyboard.press("ArrowUp");
    }

    return data;
    // fs.writeFileSync(`${username}-feed.json`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(error);
  } finally {
    browser.close();
  }
}

module.exports = extractData;

// extractData(username, 3000);

// to scroll down
// data-e2e="user-post-item-list" , first div
//click
//button data-e2e="arrow-right"

//data  <strong>
//data-e2e="browse-like-count" //likes
// data-e2e="browse-comment-count" // commment
//data-e2e="undefined-count" //saves
//data-e2e="browse-video-link" //link but need to be edited
//duration div with class css-o2z5xv-DivSeekBarTimeContainer
