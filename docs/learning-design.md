# 普段の単語学習の設計

## 参考文献と採用した原則

- Karpicke & Roediger (2008), The Critical Importance of Retrieval for Learning. Science. https://doi.org/10.1126/science.1152408 （大学研究者による外国語単語対の実験。確認済みの語も繰り返し思い出す練習を行う。）大学公開本文: https://learninglab.psych.purdue.edu/downloads/2008/2008_Karpicke_Roediger_Science.pdf
- Cepeda et al. (2008), Spacing Effects in Learning: A Temporal Ridgeline of Optimal Retention. Psychological Science. https://escholarship.org/content/qt0kp5q19x/qt0kp5q19x.pdf （UC San Diego公開。復習を時間的に分散する。保持したい期間によって間隔の効果が変わり、一律の最適間隔はない。）
- Australian Education Research Organisation, Spacing and retrieval practice guide. https://www.edresearch.edu.au/guides-resources/practice-guides/spacing-and-retrieval-practice-guide-full-publication （負担を抑えた想起、適切な難しさ、誤答への速やかな訂正。）

## アプリの実装判断

文献は以下の数値や出題順序そのものの最適性を証明するものではない。実測によって見直す初期設定である。

- 基本10語。復習期限が来た学習済み語を、コースの解放状態によらず優先。新出は3〜5語までで、復習だけで埋まれば新出ゼロ。
- 初見は単語・意味・発音を確認。確認だけでは正解数・習得度・報酬・レッスン回答済みに加算しない。同一セッションの末尾に意味選択を置く。
- 学習済みの語は英語→意味の選択、答えを隠した意味の想起、日本語→英語入力へ進む。診断レベルではなく単語ごとの回答履歴で決める。
- 選択正解は習得度を増やさず、24時間以上空いた想起成功を2回記録した語で入力を使う。誤答後は選択問題へ戻す。
- 誤答後は正答を表示。後続が3問以上残っていれば3問挟んで1回だけ再出題。キューは最大20画面で再出題の無限ループを防ぐ。後続が少なければ次回に復習する。
- 同じ日に正解を重ねても習得度や復習間隔を伸ばさない。自動送りは習得の証拠にしない。
- 既存の復習間隔は簡易ヒューリスティック。学術的に校正済みの記憶確率やFSRSとは表明しない。
- 次の難易度への進行は既存の診断コース順とレッスン解放を利用する。入力の誤字許容や語義の曖昧さは今後の改善項目。
