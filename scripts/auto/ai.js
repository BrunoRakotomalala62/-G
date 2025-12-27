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

    if (!global.temp.aiImage) global.temp.aiImage = {};

    try {
      const prompt = args.join(" ").trim();
      let imageUrl = null;

      // 🔍 Image Detection: Reply
      if (messageReply?.attachments?.length) {
        const img = messageReply.attachments.find(att =>
          att.type === "photo" || att.type === "animated_image"
        );
        if (img?.url) imageUrl = img.url;
      }
      
      // 🔍 Image Detection: Current Message
      if (!imageUrl && event.attachments?.length) {
        const img = event.attachments.find(att =>
          att.type === "photo" || att.type === "animated_image"
        );
        if (img?.url) imageUrl = img.url;
      }

      // 🔍 Image Detection: Reply (Recursive/FCA structure)
      if (!imageUrl && messageReply) {
          const attachments = messageReply.attachments || [];
          const img = attachments.find(att => att.type === "photo" || att.type === "animated_image");
          if (img?.url) imageUrl = img.url;
      }

      // 🔍 Image Detection: Memory (if no image found yet)
      if (!imageUrl && prompt && global.temp.aiImage[threadID]) {
          imageUrl = global.temp.aiImage[threadID];
      }

      // 📍 Case 1: User sends ONLY an image
      if (imageUrl && !prompt && (!messageReply || messageID === event.messageID)) {
        global.temp.aiImage[threadID] = imageUrl; // Remember the image
        return api.sendMessage(
          "📸 ━━━━━━━━━━━━━━━━━━━━━ 📸\n" +
          "✨ Image reçue avec succès !\n" +
          "❓ Veuillez maintenant poser votre question concernant cette photo afin que je puisse l'analyser pour vous.\n" +
          "━━━━━━━━━━━━━━━━━━━━━━━",
          threadID,
          messageID
        );
      }

      // 📍 Case 2: User sends NOTHING (just the command name or empty message)
      if (!prompt && !imageUrl) {
        return api.sendMessage(
          "💡 ━━━━━━━━━━━━━━━━━━ 💡\n" +
          "👋 Besoin d'aide ? Posez-moi une question ou envoyez une image !\n" +
          "━━━━━━━━━━━━━━━━━━━━",
          threadID,
          messageID
        );
      }

      // 📍 Case 3: We have a prompt (and possibly an image)
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
        // Optional: Clear memory after use
        delete global.temp.aiImage[threadID];
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