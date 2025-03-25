const fs = require("fs");
const XLSX = require("xlsx");

function exportToExcel(data, username) {
  if (!data || !username) {
    console.error("Data and username are required!");
    return;
  }

  // Convert user info & stats to a single object
  const userInfoSheet = [
    {
      Username: data.userInfo.username,
      Subtitle: data.userInfo.subtitle,
      Following: data.stats.following,
      Followers: data.stats.followers,
      Likes: data.stats.likes,
    },
  ];

  // Convert video data
  const videoStatsSheet = data.results.map((video) => ({
    Link: video.link,
    Views: video.views,
    Likes: video.likes,
    Comments: video.comments,
    Saves: video.saves,
    "Upload Date": video.uploadDate,
  }));

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Add sheets to workbook
  const userInfoWS = XLSX.utils.json_to_sheet(userInfoSheet);
  XLSX.utils.book_append_sheet(workbook, userInfoWS, "User Info");

  const videoStatsWS = XLSX.utils.json_to_sheet(videoStatsSheet);
  XLSX.utils.book_append_sheet(workbook, videoStatsWS, "Video Stats");

  // Generate filename
  const filename = `${username}.xlsx`;

  // Write the Excel file
  XLSX.writeFile(workbook, filename);

  console.log(`Excel file "${filename}" created successfully!`);
}

module.exports = exportToExcel;
