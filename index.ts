import { App, MessageEvent } from "@slack/bolt";
import { WebAPICallResult } from "@slack/web-api";
import { URL } from "url";

const timesAllChannel: string = process.env.TIMES_ALL_CHANNEL!;
const botToken: string = process.env.SLACK_BOT_TOKEN!;
const oauthAccessToken: string = process.env.OAUTH_ACCESS_TOKEN!;
const acceptableSubtypes = ["file_share", "thread_broadcast"];

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: botToken,
});

function shouldContinue(event: MessageEvent): boolean {
  if (event.subtype && !acceptableSubtypes.includes(event.subtype)) {
    console.log("skip subtype event");
    console.dir(event);
    return false;
  }

  if (event.bot_id) {
    console.log("skip bot event");
    return false;
  }

  if (event.channel === timesAllChannel) {
    console.log("skip #times_all event");
    return false;
  }

  if (event.thread_ts) {
    console.log("skip thread event");
    return false;
  }

  return true;
}

interface ConversationsInfoResult extends WebAPICallResult {
  channel: {
    name: string;
  };
}

async function isTimesChannel(channelId: string): Promise<boolean> {
  try {
    const { channel } = (await app.client.conversations.info({
      channel: channelId,
      token: oauthAccessToken,
    })) as ConversationsInfoResult;
    if (!channel.name.startsWith("times")) {
      console.log("not times channel");
      return false;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
  return true;
}

function omitMessage(message: string = ""): string {
  let omittedMessage = message
    .replace(/<([^>]+)>/g, "$1")
    .replace(/\n+/g, " ")
    .slice(0, 64);
  if (omittedMessage !== message) {
    omittedMessage = `${omittedMessage}...`;
  }
  return omittedMessage;
}

type User = {
  profile: {
    display_name: string;
    real_name: string;
    image_512: string;
  };
};

async function fetchUser(userId: string): Promise<User> {
  const { user } = await app.client.users.info({
    token: botToken,
    user: userId,
  });
  return user as User;
}

async function fetchPermalink(channel: string, ts: string): Promise<string> {
  const { permalink } = await app.client.chat.getPermalink({
    channel: channel,
    token: oauthAccessToken,
    message_ts: ts,
  });
  return permalink as string;
}

function extractLinks(message: string = ""): string[] {
  const links: string[] = [];
  const m = message.match(/<https?:\/\/[^>]+>/g);
  if (!m) return links;
  m.map((link) => link.replace(/^</, "").replace(/>$/, "")).forEach((link) =>
    links.push(link)
  );
  return links;
}

async function buildMessage({
  text = "",
  channel,
  ts,
}: {
  text?: string;
  channel: string;
  ts: string;
}): Promise<string> {
  try {
    // リンクのみの場合はそのまま流す
    new URL(text.trim().replace(/^<|>$/g, ""));
    return `<#${channel}> ${text}`;
  } catch (_e) {}

  const leadText = omitMessage(text);
  const links = extractLinks(text);
  const linkText = links.map((link) => `<${link}|link>`).join(" ");
  const permalink = await fetchPermalink(channel, ts);

  return `<#${channel}> <${permalink}|${leadText}> ${linkText}`;
}

async function postMessageAsUser(text: string, userId: string) {
  const user = await fetchUser(userId);

  await app.client.chat.postMessage({
    token: botToken,
    channel: timesAllChannel,
    text,
    username: user.profile.display_name || user.profile.real_name,
    icon_url: user.profile.image_512,
  });
}

app.event("message", async ({ event }) => {
  if (!shouldContinue(event)) return;
  if (!(await isTimesChannel(event.channel))) return;
  console.dir(event);

  try {
    const text = await buildMessage({
      channel: event.channel,
      ts: event.ts,
      text: event.text,
    });

    await postMessageAsUser(text, event.user);
  } catch (err) {
    console.error(err);
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Times All app is running!");
})();
