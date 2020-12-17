# times-all bot

## 手順

1. 必要な node_modules のインストール

   ```
   npm i -g yarn
   yarn install
   ```

2. http://api.slack.com/apps?new_app=1 にアクセスして Slack アプリの作成
3. `App Credentials` の `Signing Secret` をコピーしておく
4. `OAuth & Permissions` に移動、 `Bot Token Scopes` に以下を追加

   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `chat:write.customize`
   - `chat:write.public`
   - `users:read`

5. `Install App` に移動、 `Install to Workspace` ボタンからアプリをインストール

   - `Bot User OAuth Access Token` をコピーしておく

6. times チャンネルのメッセージを流したいチャンネルのチャンネル ID (`CXXXXXXXX`) をコピー

   - 基本的にパブリックチャンネルを前提としています
   - 参考: [Slack のチャンネル ID を確認する方法 - Qiita](https://qiita.com/unsoluble_sugar/items/603e51106d9632f3ea4f)

7. コピーしていたものを環境変数としてセット

   - `SLACK_BOT_TOKEN`: `Bot User OAuth Access Token`
   - `SLACK_SIGNING_SECRET`: `Signing Secret`
   - `TIMES_ALL_CHANNEL`: 上記で取得したチャンネル ID

8. bot の起動

   ```
   yarn start
   ```

9. bot へのリクエストの forward

   - [ngrok](https://ngrok.com/) などを利用
     ```
     ngrok http 3000
     ```
     `https://xxxxxxxxxxxx.ngrok.io` のような URL が発行されるためそれをコピーしておく

10. 再び Slack アプリの設定画面に戻り `Event Subscriptions` に移動、チェックボックスを有効化して以下の設定を追加

    - `Request URL` に ngrok などが発行した URL + `/slack/events` を入力 (例: https://xxxxxxxxxxxx.ngrok.io/slack/events)
    - `Subscribe to bot events` に `message.channels` を追加

11. 再インストールする旨のバナーが出てくる場合はリンクから再インストールの実行
