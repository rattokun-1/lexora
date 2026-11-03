# コード構成

## 実行時の責務

- `src/app.js`: 画面遷移、状態、モーダル、学習画面のUI
- `src/cloud.js`: Supabase接続、認証、ユーザーデータ同期、レビュー送信
- `src/learning-events.js`: モデル用イベントの許可項目と端末キュー上限
- `src/scheduler.js`: FSRSによる記憶状態、復習計画、回答後の更新
- `src/duel.js`: ワードスプリントの状態取得、回答送信、タイマー、描画
- `src/placement.js`: 初回レベル診断の出題と進行
- `src/progression.js`: 学習進行と日付単位の集計
- `src/world-map.js`: 旅の3D表示ライフサイクル

## スタイルの読み込み順

1. `styles.css`: 互換用テーマトークン、リセット、共通コンポーネント
2. `cloudly-glass.css`: ガラス表現と既存画面の共通スタイル
3. `quest-ui.css`: 旅・ホームの画面スタイル
4. `kotomia.css`: コトミアの製品テーマと最終的な画面別上書き

互換性のため、内部識別子や保存キーに残る旧名称は変更しません。新しいUIや機能の表示名はコトミアに統一します。

## 変更時の原則

- 学習の終了条件、出題条件、FSRSの既存データ互換性を先に確認する
- 認証・同期エラーは握りつぶさず、既存の通知経路へ渡す
- モデルイベントにはプロフィール情報を追加しない
- `src/vendor/`と`world-map.bundle.js`は生成物・外部コードのため手動整理しない
- 整理後は`npm run check`、`npm test`、`npm run build`を実行する
