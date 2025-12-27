const axios = require("axios");

if (!global.GoatBot.onReply) {
  global.GoatBot.onReply = new Map();
}

module.exports = {
  config: {
    name: "music",
    version: "2.4.0",
    author: "April Manalo (YT Search + YTMP3)",
    role: 0,
    category: "music",
    guide: "-music <song name>"
  },

  // ================= START =================
  onStart: async function ({ api, event, args }) {
    const threadID = String(event.threadID);
    const senderID = String(event.senderID);
    const query = args.join(" ").trim();

    try {
      if (!query) {
        return api.sendMessage(
          "⚠️ Usage: -music <song name>\nExample: -music hiling mark carpio",
          threadID
        );
      }

      await api.sendMessage(
        "🔎 Searching music on YouTube...",
        threadID
      );

      const searchRes = await axios.get(
        "https://norch-project.gleeze.com/api/youtube",
        { params: { q: query } }
      );

      const results = searchRes.data?.results;
      if (!results || !results.length) {
        return api.sendMessage("❌ No results found.", threadID);
      }

      const topResults = results.slice(0, 5);
      let msg = "🎵 Select a song:\n\n";

      topResults.forEach((v, i) => {
        msg += `${i + 1}. ${v.title}\n📺 ${v.channel}\n⏱ ${v.duration}\n\n`;
      });

      msg += "💬 Reply with number (1-5)";

      api.sendMessage(msg, threadID, (err, info) => {
        if (err) return console.error(err);

        global.GoatBot.onReply.set(String(info.messageID), {
          commandName: "music",
          messageID: String(info.messageID),
          author: senderID,
          results: topResults
        });
      });

    } catch (e) {
      console.error("[MUSIC ERROR]", e);
      api.sendMessage("❌ Error occurred.", threadID);
    }
  },

  // ================= REPLY =================
  onReply: async function ({ api, event, Reply }) {
    const threadID = String(event.threadID);
    const senderID = String(event.senderID);

    if (senderID !== Reply.author) return;

    const choice = parseInt(event.body);
    if (isNaN(choice) || choice < 1 || choice > Reply.results.length) {
      return api.sendMessage("⚠️ Invalid choice.", threadID);
    }

    const video = Reply.results[choice - 1];

    try {
      api.unsendMessage(String(Reply.messageID));
    } catch (_) {}

    try {
      await api.sendMessage(
        `⬇️ Downloading:\n🎧 ${video.title}`,
        threadID
      );

      const dl = await axios.get(
        "https://norch-project.gleeze.com/api/ytmp3",
        { params: { url: video.url } }
      );

      const data = dl.data?.result;
      if (!data?.downloadUrl) {
        return api.sendMessage("❌ Download failed.", threadID);
      }

      if (data.cover) {
        await api.sendMessage(
          {
            body: `🎵 ${data.title}\n⏱ ${data.duration}`,
            attachment: await global.utils.getStreamFromURL(data.cover)
          },
          threadID
        );
      }

      await api.sendMessage(
        {
          body: "📁 Audio file:",
          attachment: await global.utils.getStreamFromURL(data.downloadUrl)
        },
        threadID
      );

      api.sendMessage("✅ Done!", threadID);

    } catch (e) {
      console.error("[MUSIC DL ERROR]", e);
      api.sendMessage("❌ Error while downloading.", threadID);
    }

    global.GoatBot.onReply.delete(String(Reply.messageID));
  }
};
