# Integration closure — documentation validation record

Scope: documentation and protocol-reference closure only. Product baseline inspected: main `367da83`; tracker baseline `e1b4acb`. Approval covered closing integration in the existing worktree, not implementing the viewer.

## Evidence

- **Package/reference validator — PASS.** `python .scratch/vertical-builds/validation/check_viewer_integration.py` from the scratch worktree: 6 canonical frame vectors, 671 local Markdown links, 22 Markdown anchor references, required phase/spec artifacts, and open implementation/trial/research/HEC states.
- **Wayfinder Model 2 — PASS.** Installed `graph-sync.mjs validate-v2 --feature vertical-builds --workspace ../satisfactorymap-scratch` reported `ok:true`, 80 checked tickets, 90 projected nodes, 0 stages. Fired chart through fallback `sync` then `render --targets html`; `graph/graph.json` and `graph/star-map.html` are current. Comparison with HEAD preserved every node id, status and Spec association; no campaign strand was promoted.
- **Diff/scope — PASS.** `git -C ../satisfactorymap-scratch -c core.safecrlf=false diff --check` passed. Explicit whitespace/final-newline/syntax review covered all 13 new artifacts, including files not visible to ordinary git diff. All other ticket bodies and approved strand clarifications are unchanged. Product checkout status still contains exactly the original three untracked vendor/proof files.
- **Python diagnostics — PASS.** Configured Ruff LSP reported 0 diagnostics for the document validator; Ruff source-fix preview made no changes. Python `compile(..., 'exec')` also passed without creating runtime/cache files.
- **Minimum kit source check — PASS, limited evidence.** All 13 exact minimum non-path class keys exist in the available generated docs table. This checks source metadata presence only, not authored forms or actual scene coverage.

### Validation scope and corrections

The link scan covers viewer specs (including preserved supporting per-ticket specs), integration/phase documents, map/continuation entry points, implementation tickets 60/79 and this validation record. An initial whole-campaign scan exposed an existing broken local link in untouched `research/3d-fork-options.md` (`04-survey-the-current-map.md`); unrelated historical research internals were left unchanged and are not claimed link-clean. Links **to** referenced research artifacts still must resolve.

The reference pass also caught a transcription error in the empty-frame header hex; it was corrected and all six pinned frames then passed. These are document corrections, not runtime bug fixes.

## Evidence limits

No application Rust tests, WASM/native builds, browser viewer flows, geometry comparison, hardware/performance runs, rebuilt Tauri, hosted browser, deployment or in-game check ran as part of this documentation task. The six canonical frames are hand-authored protocol fixtures, not saves or extracted game tables. Their consistency is not a producer/consumer implementation pass.

Implementation 60, acceptance 54–56, delivery 58, real modded corpus 59 and free-form research/refinement 61 remain open. All HEC runtime criteria and final smoke remain OPEN/NOT STARTED. Existing unrelated `.cursor/rules/`, local vendor files and transform-proof example were preserved. No staging, commit, push, merge or deployment is included.
