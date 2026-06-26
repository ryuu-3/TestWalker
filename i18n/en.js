/* TestWalker - English dictionary */
TW_I18N.register("en", {
  __name__: "English",

  "doc.title": "TestWalker - Manual Test Runner",

  "header.lang": "Language",
  "header.savedFlash": "✓ Auto-saved",
  "header.reload": "↻ Reload",
  "header.reload.title": "Load JSON again",
  "header.report": "📄 Export HTML report",
  "header.reset": "🗑 Reset records",
  "header.reset.title": "Clear records",
  "header.meta": "{title} — {count} cases",

  "loader.proc.title": "① Test procedure JSON",
  "loader.data.title": "② Test data JSON",
  "loader.required": "*required",
  "loader.optional": "(optional)",
  "loader.dropHint": "Drag & drop a file / click to choose",
  "loader.unselected": "Not selected",
  "loader.pasteHint": "or paste JSON here",
  "loader.build": "Generate screen ▶",
  "loader.buildHint": "The procedure JSON alone is enough. Providing a data JSON expands cases in a data-driven way.",
  "loader.sampleSummary": "Show JSON format examples",
  "loader.sampleProcDesc": "Procedure JSON ({{key}} tokens in steps are replaced by data)",
  "loader.sampleDataDesc": "Test data JSON (linked by case ID; put input values under data; label=name, expected=expected outcome)",
  "loader.loadSample": "↑ Load this sample",
  "loader.pasted": "(pasted)",
  "loader.sample": "(sample)",
  "loader.clear": "Clear",
  "loader.copy": "Copy",

  "copy.copied": "✓ Copied",
  "copy.clickToCopy": "Click to copy",

  "err.noProc": "Please load a test procedure JSON.",
  "err.procParse": "Failed to parse procedure JSON: {msg}",
  "err.dataParse": "Failed to parse data JSON: {msg}",
  "err.noCases": "No \"testCases\" array found in the procedure JSON. See the format examples.",

  "runner.search": "🔍 Filter by case ID / title",
  "runner.expandAll": "Expand all",
  "runner.collapseAll": "Collapse all",
  "runner.noMatch": "No matching cases.",

  "filter.all": "All",

  "status.pending": "Pending",
  "status.pass": "Pass",
  "status.fail": "Fail",
  "status.blocked": "Blocked",
  "status.skip": "Skip",

  "summary.total": "Total",
  "summary.progress": "Progress {done}/{total}",

  "case.untitled": "(untitled)",
  "case.dataDefault": "Data #{n}",
  "case.precondition": "Precondition: ",
  "case.expected": "Expected outcome: ",
  "case.noSteps": "No step definitions.",
  "case.stepProgress": "Steps {done}/{total}",

  "step.no": "#",
  "step.action": "Step",
  "step.expected": "Expected result",
  "step.check": "Done",
  "ph.undefined": "data undefined",

  "record.judge": "Result",
  "record.actual": "Actual / notes",
  "record.actualPh": "Record the actual result, defect details, etc.",
  "record.tester": "Tester",
  "record.testerPh": "Name",
  "record.updated": "Updated: {ts}",

  "reset.confirm": "This will erase all records (status and actual results) for this test. Continue?",

  "report.title": "{title} — Test Result Report",
  "report.docTitle": "{title} Report",
  "report.generatedAt": "Generated at: {ts}",
  "report.precond": "Precondition: {v}",
  "report.actual": "Actual result:",
  "report.metaLine": "Tester: {tester} / Updated: {ts}",
  "report.total": "Total",
  "report.empty": "—",
  "report.filePrefix": "TestReport",

  "footer": "TestWalker — Manual test runner & recorder"
});
