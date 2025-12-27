const axios = require("axios");

module.exports = {
  config: {
    name: "ai",
    version: "2.2.0",
    author: "April Manalo",
    role: 0,
    category: "ai",
    cooldown: 5
  },

  onStart: async function ({ api, event, args, usersData }) {
    let waitMsg;
    const { threadID, messageID, messageReply, senderID } = event;

    try {
      const prompt = args.join(" ").trim();
      let imageUrl = null;

      // 🔍 Image Detection
      if (messageReply?.attachments?.length) {
        const img = messageReply.attachments.find(att =>
          att.type === "photo" || att.type === "animated_image"
        );
        if (img?.url) imageUrl = img.url;
      } else if (event.attachments?.length) {
        const img = event.attachments.find(att =>
          att.type === "photo" || att.type === "animated_image"
        );
        if (img?.url) imageUrl = img.url;
      }

      // 📍 Logic: Image attached but no prompt
      if (imageUrl && !prompt) {
        return api.sendMessage(
          "📸 ━━━━━━━━━━━━━━━━━━ 📸\n" +
          "✨ J'ai bien reçu votre photo !\n" +
          "❓ Donnez-moi votre question basée sur cette photo pour que je puisse l'analyser.\n" +
          "━━━━━━━━━━━━━━━━━━━━",
          threadID,
          messageID
        );
      }

      // 📍 Logic: Nothing provided
      if (!prompt && !imageUrl) {
        return api.sendMessage(
          "💡 ━━━━━━━━━━━━━━━━━━ 💡\n" +
          "👋 Besoin d'aide ? Posez-moi une question ou envoyez une image !\n" +
          "━━━━━━━━━━━━━━━━━━━━",
          threadID,
          messageID
        );
      }

      waitMsg = await api.sendMessage("🤖 🔍 Analyse en cours...", threadID);

      const userData = await usersData.get(senderID);
      const name = userData.name || "Utilisateur";

      // 🌐 API Request
      const params = {
        q: prompt || "décrivez cette photo",
        uid: senderID,
        model: "claude-sonnet-4-5-20250929",
        apikey: "rapi_4806a41790cd4a83921d56b667ab3f16"
      };

      if (imageUrl) {
        params.image = imageUrl;
      }

      const { data } = await axios.get("https://rapido.zetsu.xyz/api/anthropic", { params, timeout: 30000 });

      if (!data?.response) {
        throw new Error("Invalid API response");
      }

      const decoratedResponse = 
        `✨ ━━━━━━━━━━━━━━ ✨\n` +
        `👤 𝗣𝗼𝘂𝗿 : ${name}\n` +
        `🤖 𝗔𝗜 𝗥𝗲́𝗽𝗼𝗻𝘀𝗲 :\n\n` +
        `${data.response}\n\n` +
        `━━━━━━━━━━━━━━ ✨`;

      await api.sendMessage(decoratedResponse, threadID, messageID);

      if (waitMsg?.messageID) {
        api.unsendMessage(waitMsg.messageID);
      }

    } catch (err) {
      console.error("[AI ERROR]", err?.message || err);
      api.sendMessage("❌ Désolé, une erreur est survenue lors du traitement.", threadID, messageID);
      if (waitMsg?.messageID) api.unsendMessage(waitMsg.messageID);
    }
  }
};