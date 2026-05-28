/* ================================================================
   js/tools/template.js  —  STARTER TEMPLATE FOR A NEW TOOL
   ================================================================

   HOW TO USE THIS FILE
   ─────────────────────
   1. Copy this file and rename it:
        cp js/tools/template.js js/tools/mytool.js

   2. Replace every occurrence of "mytool" / "MyTool" / "my tool"
      with your tool's real name.

   3. In index.html:
        a) Uncomment (or add) a tab button:
             <button class="tool-tab" id="tab-mytool" role="tab"
                     aria-selected="false" onclick="switchTool('mytool')">
               My tool name
             </button>

        b) Uncomment (or add) a panel block:
             <div id="panel-mytool" class="tool-panel" role="tabpanel">
               ... your HTML ...
             </div>

        c) Add a script tag at the bottom of <body>:
             <script src="js/tools/mytool.js"></script>

   4. Edit MYTOOL_SYSTEM_PROMPT to describe what the AI should do.

   5. Edit runMyTool() to read your inputs and call the API.

   6. Edit renderMyToolResults() to display the output.

   Dependencies available (loaded in index.html before tool scripts):
     - callApi(systemPrompt, userContent, maxTokens?)  → Promise<string>
     - parseJsonResponse(rawText)                      → any
     - showBanner(elementId, message, type?)
     - hideBanner(elementId)
   ================================================================ */


/* ── System prompt ────────────────────────────────────────────────
   Write clear instructions here. Key rules:
     1. Tell the model exactly what to check or produce.
     2. Always end with: "Return ONLY valid JSON, no markdown fences,
        no preamble, in exactly this shape: { ... }"
     3. Include an example of the JSON shape you expect.
────────────────────────────────────────────────────────────────── */
const MYTOOL_SYSTEM_PROMPT = `
You are a helpful data assistant.

[Describe what you want the AI to do here.]

Return ONLY valid JSON, no markdown fences, no preamble, in exactly this shape:
{
  "results": [
    { "id": "...", "label": "...", "detail": "..." }
  ],
  "summary": "..."
}
`.trim();


/**
 * runMyTool()
 * Called by the "Run" button in your panel.
 * 1. Read inputs from the DOM.
 * 2. Call the API.
 * 3. Pass the result to your render function.
 */
async function runMyTool() {
  hideBanner('mytool-err-banner');

  // ── Read your inputs ──────────────────────────────────────────
  const inputValue = document.getElementById('mytool-input').value.trim();
  if (!inputValue) {
    showBanner('mytool-err-banner', 'Please enter some data first.');
    return;
  }

  // ── Show loading state ────────────────────────────────────────
  const runBtn    = document.getElementById('mytool-run-btn');
  const statusBar = document.getElementById('mytool-status');
  runBtn.disabled = true;
  statusBar.classList.remove('hidden');

  try {
    // ── Call the AI ─────────────────────────────────────────────
    const rawText = await callApi(MYTOOL_SYSTEM_PROMPT, inputValue);
    const result  = parseJsonResponse(rawText);

    // ── Render results ───────────────────────────────────────────
    renderMyToolResults(result);

  } catch (err) {
    showBanner('mytool-err-banner', 'Error: ' + err.message);
  } finally {
    runBtn.disabled = false;
    statusBar.classList.add('hidden');
  }
}


/**
 * renderMyToolResults(result)
 * Builds the output HTML and shows the results card.
 *
 * @param {{ results: object[], summary: string }} result
 */
function renderMyToolResults(result) {
  const outputEl = document.getElementById('mytool-output');

  // Example: render each result as a simple list
  outputEl.innerHTML = `
    <p style="font-size:13px;color:var(--ink-mid);margin-bottom:1rem;">
      ${result.summary}
    </p>
    <ul style="padding-left:1.25rem;font-size:13px;line-height:1.8;
               color:var(--ink-mid);">
      ${result.results.map(r => `<li><strong>${r.label}</strong> — ${r.detail}</li>`).join('')}
    </ul>`;

  document.getElementById('mytool-results-card').classList.remove('hidden');
}


/**
 * resetMyTool()
 * Clears state and returns the panel to its initial state.
 */
function resetMyTool() {
  document.getElementById('mytool-input').value = '';
  document.getElementById('mytool-output').innerHTML = '';
  document.getElementById('mytool-results-card').classList.add('hidden');
  hideBanner('mytool-err-banner');
}


/* ── Matching HTML panel for index.html ───────────────────────────
   Paste this block into index.html where the panels are defined.
   ─────────────────────────────────────────────────────────────────

<div id="panel-mytool" class="tool-panel" role="tabpanel">

  <div class="card">
    <p class="section-label">My tool — description</p>

    <div class="banner banner-danger hidden" id="mytool-err-banner">
      <svg width="16" height="16" fill="none" stroke="currentColor"
           stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span></span>
    </div>

    <div class="field-group" style="margin-bottom:1rem;">
      <label>Input data</label>
      <textarea id="mytool-input" rows="6"
                placeholder="Paste your data here..."></textarea>
    </div>

    <button class="btn-primary" id="mytool-run-btn" onclick="runMyTool()">
      Run
    </button>

    <div class="status-bar hidden" id="mytool-status">
      <div class="spinner"></div>
      <span>Processing…</span>
    </div>
  </div>

  <div class="card hidden" id="mytool-results-card">
    <p class="section-label">Results</p>
    <div id="mytool-output"></div>
    <button class="btn-secondary" onclick="resetMyTool()"
            style="margin-top:1rem;">
      Reset
    </button>
  </div>

</div>

─────────────────────────────────────────────────────────────────── */
