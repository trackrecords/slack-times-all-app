import { App } from "@slack/bolt";

const timesAllChannel: string = process.env.TIMES_ALL_CHANNEL!;
const botToken: string = process.env.SLACK_BOT_TOKEN!;
const oauthAccessToken: string = process.env.OAUTH_ACCESS_TOKEN!;
const acceptableSubtypes = ["file_share", "thread_broadcast"];

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: botToken,
});

app.event("message", async ({ event }) => {
  if (event.subtype && !acceptableSubtypes.includes(event.subtype)) {
    console.log("skip subtype event");
    console.dir(event);
    return;
  }

  if (event.bot_id) {
    console.log("skip bot event");
    return;
  }

  if (event.channel === timesAllChannel) {
    console.log("skip #times_all event");
    return;
  }

  if (event.thread_ts) {
    console.log("skip thread event");
    return;
  }

  console.dir(event);

  try {
    const channelInfoRes = await app.client.conversations.info({
      channel: event.channel,
      token: oauthAccessToken,
    });
    if (!(channelInfoRes.channel as any).name.startsWith("times")) {
      console.log("not times channel");
      return;
    }
  } catch (err) {
    console.error(err);
    return;
  }

  try {
    const userRes = await app.client.users.info({
      token: botToken,
      user: event.user,
    });
    const user = userRes.user as any;

    const permalinkRes = await app.client.chat.getPermalink({
      channel: event.channel,
      token: oauthAccessToken,
      message_ts: event.ts,
    });

    const originalText = event.text || "";
    let leadText = originalText
      .replace(/<([^>]+)>/g, "$1")
      .replace(/\n+/g, " ")
      .slice(0, 32);
    if (leadText !== originalText) {
      leadText = `${leadText}...`;
    }

    await app.client.chat.postMessage({
      token: botToken,
      channel: timesAllChannel,
      text: `<#${event.channel}> <${permalinkRes.permalink}|${leadText}>`,
      username: user.profile.display_name || user.profile.real_name,
      icon_url: user.profile.image_512,
    });
  } catch (err) {
    console.error(err);
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Times All app is running!");
})();
