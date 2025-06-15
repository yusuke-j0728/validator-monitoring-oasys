# 🚀 次のステップ - 設定と実行

## ✅ 完了した作業
- ローカル開発環境のセットアップ
- Google Apps Scriptプロジェクトの作成
- コードのデプロイ完了

## 📋 必要な設定作業

### 1. バリデーターアドレスの設定

**ファイル**: `src/main.js`
**場所**: `CONFIG.VALIDATOR_ADDRESSES`配列

```javascript
const CONFIG = {
  VALIDATOR_ADDRESSES: [
    "0x1234567890abcdef1234567890abcdef12345678",  // ← あなたのバリデーターアドレス
    "0xabcdef1234567890abcdef1234567890abcdef12"   // ← 追加のバリデーター
  ],
  // ...
};
```

### 2. Slack Webhook URLの設定

**手順**:
1. Google Apps Script エディタを開く（既に開いています）
2. 左メニューから「プロジェクトの設定」⚙️をクリック
3. 「スクリプト プロパティ」セクションで「スクリプト プロパティを追加」
4. 以下を入力:
   - **プロパティ**: `SLACK_WEBHOOK_URL`
   - **値**: あなたのSlack Webhook URL

### 3. 初期化の実行

Google Apps Scriptエディタで:
1. ファイル選択ドロップダウンから「main.js」を選択
2. 関数選択ドロップダウンから「setup」を選択
3. 「実行」ボタンをクリック
4. 権限を求められたら「承認」をクリック

### 4. テスト実行

1. 関数選択ドロップダウンから「testMonitoring」を選択
2. 「実行」ボタンをクリック
3. 実行ログを確認
4. Slackに通知が届くことを確認

## 🔧 設定のカスタマイズ

### 監視間隔の調整
```javascript
CHECK_INTERVAL_MINUTES: 15,  // 15分ごと（1-1440の範囲）
```

### アラート閾値の調整
```javascript
MIN_BLOCKS_PER_24H: 24,      // 24時間で最低24ブロック
MAX_BLOCK_DELAY_MINUTES: 30, // 30分以上ブロック生成がない場合アラート
```

### 通知設定
```javascript
SEND_SUCCESS_NOTIFICATIONS: false, // 正常時の通知（通常はfalse）
SEND_DAILY_SUMMARY: true,          // 日次サマリー（9AM）
```

## 🎯 確認ポイント

### ✅ 設定完了チェックリスト
- [ ] バリデーターアドレスを設定済み
- [ ] Slack Webhook URLを設定済み
- [ ] setup()関数を実行済み
- [ ] testMonitoring()でテスト実行済み
- [ ] Slackに通知が届いた

### 📊 監視項目
- **バリデーターステータス**: アクティブ/非アクティブ
- **ジェイル状態**: ジェイルされているか
- **ブロック生成数**: 24時間でのブロック生成数
- **最終ブロック時刻**: 最後にブロックを生成した時刻

### 🚨 アラートレベル
- **🟢 HEALTHY**: すべて正常
- **⚠️ WARNING**: 軽微な問題（ブロック生成遅延など）
- **🚨 CRITICAL**: 重大な問題（非アクティブ、ジェイル状態）
- **🔥 ERROR**: データ取得エラー

## 🔍 トラブルシューティング

### エラーが発生した場合
1. **実行ログの確認**: GASエディタ → 実行 → ログを表示
2. **権限エラー**: 再度権限を承認
3. **RPC接続エラー**: ネットワーク設定を確認
4. **Slack通知エラー**: Webhook URLを再確認

### よくある問題
- **403エラー**: 権限が不足している
- **Slack通知が届かない**: Webhook URLが間違っている
- **バリデーター情報が取得できない**: アドレスが間違っている

## 📈 次のステップ

### 1. 数日間の動作確認
- 通知が正しく送信されるか
- アラート閾値が適切か
- 日次サマリーが送信されるか

### 2. 設定の調整
- 監視間隔の最適化
- アラート閾値の調整
- 通知内容のカスタマイズ

### 3. 機能拡張（オプション）
- 複数のSlackチャンネルへの通知
- Discord通知の追加
- メール通知の設定
- グラフィカルなレポート生成

## 🔗 リンク
- **GAS エディタ**: https://script.google.com/d/1kTsLpwNHE50tpv9b1voNG0qmjghcF-Iw2HO0S18zQqe8RtIw6GtP6LJ5/edit
- **Oasys Explorer**: https://explorer.oasys.games/
- **Slack Webhook設定**: https://api.slack.com/apps

---

**質問や問題がございましたら、お気軽にお声かけください！**