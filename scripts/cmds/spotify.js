const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "spotify",
    version: "1.1.0",
    author: "April Manalo",
    role: 0,
    category: "music",
    guide: "spotify <song name>"
  },

  onStart: async function ({ api, event, args }) {
    const query = args.join(" ").trim();
    if (!query) {
      return api.sendMessage(
        "⚠️ Usage: -spotify <song name>",
        event.threadID,
        String(event.messageID)
      );
    }

    let searchMsg;
    try {
      searchMsg = await api.sendMessage("🔎 Searching Spotify...", event.threadID);

      const res = await axios.get(
        "https://norch-project.gleeze.com/api/spotify",
        { params: { q: query } }
      );

      const songs = res.data?.results?.slice(0, 5);
      if (!songs || songs.length === 0) {
        return api.editMessage("❌ No results found.", searchMsg.messageID);
      }

      let msg = "🎧 Spotify Results:\n\n";
      songs.forEach((s, i) => {
        msg += `${i + 1}. ${s.title}\n👤 ${s.artist}\n⏱ ${s.duration}\n\n`;
      });
      msg += "👉 Reply with number (1–5)";

      await api.editMessage(msg, searchMsg.messageID);

      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: searchMsg.messageID,
        author: event.senderID,
        type: "spotify_select",
        songs
      });

    } catch (err) {
      console.error("[SPOTIFY SEARCH ERROR]", err);
      if (searchMsg) {
        api.editMessage("❌ Failed to search Spotify.", searchMsg.messageID);
      }
    }
  },

  handleReply: async function ({ api, event, handleReply }) {
    if (event.senderID !== handleReply.author) return;

    const choice = parseInt(event.body);
    if (isNaN(choice) || choice < 1 || choice > handleReply.songs.length) {
      return api.sendMessage(
        "❌ Invalid choice. Reply 1–5 only.",
        event.threadID,
        String(event.messageID)
      );
    }

    const song = handleReply.songs[choice - 1];

    // ✅ UNSEND choices message
    api.unsendMessage(handleReply.messageID);

    // ✅ SEND downloading message
    const downloadingMsg = await api.sendMessage(
      `⏳ Downloading:\n🎵 ${song.title}\n👤 ${song.artist}`,
      event.threadID
    );

    try {
      const dl = await axios.get(
        "https://norch-project.gleeze.com/api/spotify-dl-v2",
        { params: { url: song.spotify_url } }
      );

      const track = dl.data?.trackData?.[0];
      if (!track?.download_url) {
        return api.editMessage("❌ Download failed.", downloadingMsg.messageID);
      }

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const mp3Path = path.join(cacheDir, `${Date.now()}.mp3`);
      const imgPath = path.join(cacheDir, `${Date.now()}.jpg`);

      // download mp3
      const mp3 = await axios.get(track.download_url, { responseType: "arraybuffer" });
      fs.writeFileSync(mp3Path, Buffer.from(mp3.data));

      // download cover
      const img = await axios.get(track.image, { responseType: "arraybuffer" });
      fs.writeFileSync(imgPath, Buffer.from(img.data));

      // send cover
      await api.sendMessage({
        body: `🎵 ${track.name}\n👤 ${track.artists}`,
        attachment: fs.createReadStream(imgPath)
      }, event.threadID);

      // send mp3 as voice
      await api.sendMessage({
        attachment: fs.createReadStream(mp3Path)
      }, event.threadID);

      // cleanup
      fs.unlinkSync(mp3Path);
      fs.unlinkSync(imgPath);

      // remove handleReply
      global.client.handleReply =
        global.client.handleReply.filter(h => h.messageID !== handleReply.messageID);

    } catch (err) {
      console.error("[SPOTIFY DOWNLOAD ERROR]", err);
      api.editMessage("❌ Error downloading song.", downloadingMsg.messageID);
    }
  }
};
