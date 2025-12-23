const axios = require("axios");

module.exports = {
  config: {
    name: "ai",
    version: "2.1.0",
    author: "April Manalo",
    role: 0,
    category: "ai",
    cooldown: 5
  },

  onStart: async function ({ api, event, args }) {
    let waitMsg;

    try {
      const text = args.join(" ").trim();
      let imageUrl = null;

      // ✅ SAFE IMAGE DETECTION (ws3-fca)
      if (event.messageReply?.attachments?.length) {
        const img = event.messageReply.attachments.find(att =>
          att.type === "photo" || att.type === "animated_image"
        );

        if (img?.url) imageUrl = img.url;
      }

      // ❌ nothing provided
      if (!text && !imageUrl) {
        return api.sendMessage(
          "⚠️ Please type a question or reply to an image.",
          event.threadID,
          String(event.messageID)
        );
      }

      waitMsg = await api.sendMessage(
        "🤖 Thinking...",
        event.threadID
      );

      // 🌐 API REQUEST (NO INTERNAL PROMPT)
      const { data } = await axios.get(
        "https://norch-project.gleeze.com/api/Gpt4.1nano",
        {
          params: {
            text: text || undefined,
            imageUrl: imageUrl || undefined
          },
          timeout: 20000
        }
      );

      if (!data?.success || !data?.result) {
        throw new Error("Invalid API response");
      }

      await api.sendMessage(
        data.result,
        event.threadID,
        String(event.messageID)
      );

      if (waitMsg?.messageID) {
        api.unsendMessage(waitMsg.messageID);
      }

    } catch (err) {
      console.error("[AI ERROR]", err?.message || err);

      api.sendMessage(
        "❌ Failed to process request.",
        event.threadID,
        String(event.messageID)
      );

      if (waitMsg?.messageID) {
        api.unsendMessage(waitMsg.messageID);
      }
    }
  }
};
