const extractData = require("./profile-feed.js"); //returns an
const views = require("./views.js");
const fs = require("fs");
console.time("time");
const username = "wowgreatplace";

// Run both functions concurrently
Promise.all([extractData(username, 10), views(username)])
  .then(([engagement, creatorViews]) => {
    const results = creatorViews.results;

    const merged = results.map((result) => {
      const match = engagement.find((e) => e.link === result.link);
      return match ? { ...result, ...match } : result;
    });

    const final = {
      userInfo: creatorViews.userInfo,
      stats: creatorViews.stats,
      results: merged,
    };

    // Write merged data to file
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
  })
  .catch((err) => {
    console.error("❌ Error during merging:", err);
  });
console.timeEnd("time");
