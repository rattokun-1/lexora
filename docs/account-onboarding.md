# アカウント作成と復旧の設定

実装済みの流れ：

- 初回：ユーザー名（ユーザーIDと同じ）・復旧用メール → Magic Linkを開く → アプリに戻ってパスキー登録。
- 通常ログイン：パスキー。
- 紛失時：ログイン画面の「パスキーを紛失した方」→ 登録メールの確認コード → 既存データ復元 → 新しいパスキー登録。
- パスワードは使用しません。メールはSupabase Authに保管し、user_dataへの重複保存を避けています。

Supabaseの設定：

1. AuthenticationでEmailによる登録とメール確認を有効にし、新規登録を許可。
2. Email Templatesの「Magic Link」には [email-magic-link.html](../supabase/templates/email-magic-link.html) を、「Confirm signup」「Email OTP」には [email-otp.html](../supabase/templates/email-otp.html) を貼り付ける。Magic Linkでは {{ .ConfirmationURL }}、OTPでは {{ .Token }} を使用する。
3. 本番送信にはCustom SMTPを設定。標準メール送信は送信先制限・レート制限があるため、一般ユーザーへの到達を確認。
4. Passkeysを有効化し、RP ID=tanq.dashcloudly.com、Origin=https://tanq.dashcloudly.com を設定。
5. 登録→メール確認→パスキー登録→ログアウト→パスキーログイン→メール復旧を本番HTTPSで確認。

メール送信・実機パスキー作成は本人による検証が必要です。メールボックスへのアクセスを失うと復旧できない場合があります。別端末のパスキーも追加できます。
