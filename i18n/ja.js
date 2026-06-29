/* TestWalker - Japanese dictionary */
TW_I18N.register("ja", {
  __name__: "日本語",

  "doc.title": "TestWalker - 手動テスト実施UI",

  "header.lang": "言語",
  "header.savedFlash": "✓ 自動保存しました",
  "header.reload": "↻ 再読込",
  "header.reload.title": "JSONを読み込み直す",
  "header.report": "📄 HTMLレポート出力",
  "header.reset": "🗑 記録リセット",
  "header.reset.title": "記録をクリア",
  "header.meta": "{title} — {count}件",

  "loader.proc.title": "① テスト手順JSON",
  "loader.data.title": "② テストデータJSON",
  "loader.required": "*必須",
  "loader.optional": "(任意)",
  "loader.dropHint": "ファイルをドラッグ＆ドロップ / クリックして選択",
  "loader.unselected": "未選択",
  "loader.pasteHint": "または ここにJSONを貼り付け",
  "loader.build": "画面を生成 ▶",
  "loader.buildHint": "手順JSONだけでも生成できます。データJSONを与えるとデータ駆動で展開されます。",
  "loader.sampleSummary": "JSONフォーマットの例を見る",
  "loader.sampleProcDesc": "手順JSON（手順文の {{キー}} はデータで置換されます）",
  "loader.sampleDataDesc": "テストデータJSON（ケースIDで紐付け。入力値は data に入れ、label=識別名。期待結果は手順側に書く）",
  "loader.loadSample": "↑ このサンプルを読み込む",
  "loader.pasted": "(貼り付け)",
  "loader.sample": "(サンプル)",
  "loader.clear": "クリア",
  "loader.copy": "コピー",

  "copy.copied": "✓ コピーしました",
  "copy.clickToCopy": "クリックでコピー",

  "err.noProc": "テスト手順JSONを読み込んでください。",
  "err.procParse": "手順JSONの解析に失敗しました: {msg}",
  "err.dataParse": "データJSONの解析に失敗しました: {msg}",
  "err.noCases": "手順JSONに \"testCases\" 配列が見つかりません。フォーマット例を参照してください。",

  "runner.search": "🔍 ケースID・タイトルで絞り込み",
  "runner.expandAll": "全て展開",
  "runner.collapseAll": "全て折畳",
  "runner.noMatch": "該当するケースがありません。",

  "filter.all": "すべて",

  "status.pending": "未実施",
  "status.pass": "Pass",
  "status.fail": "Fail",
  "status.blocked": "Blocked",
  "status.skip": "Skip",

  "summary.total": "総ケース",
  "summary.progress": "進捗 {done}/{total}",

  "case.untitled": "(無題)",
  "case.dataDefault": "データ#{n}",
  "case.precondition": "前提条件：",
  "case.noSteps": "手順ステップの定義はありません。",
  "case.stepProgress": "OK {ok}・NG {ng}・未 {none}",

  "step.no": "#",
  "step.action": "操作手順",
  "step.expected": "期待結果",
  "step.result": "結果",
  "stepResult.none": "未実施",
  "ph.undefined": "データ未定義",

  "record.judge": "判定",
  "record.actual": "実測結果・備考",
  "record.actualPh": "実際の結果・不具合の詳細などを記録",
  "record.tester": "実施者",
  "record.testerPh": "氏名",
  "record.updated": "最終更新: {ts}",
  "record.passLocked": "全ステップを OK にすると Pass にできます",

  "reset.confirm": "このテストの記録（ステータス・実測結果）をすべて消去します。よろしいですか？",

  "report.title": "{title} — テスト結果レポート",
  "report.docTitle": "{title} レポート",
  "report.generatedAt": "出力日時: {ts}",
  "report.precond": "前提: {v}",
  "report.actual": "実測結果:",
  "report.metaLine": "実施者: {tester} / 更新: {ts}",
  "report.total": "総数",
  "report.empty": "—",
  "report.filePrefix": "TestReport",

  "footer": "TestWalker — 手動テスト実施・記録ツール"
});
