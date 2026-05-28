let parsedRows = [];
let fileHeaders = [];

setupSpreadsheetUpload({
  dropZoneId: 'checker-drop-zone',
  fileInputId: 'checker-file-input',

  onLoaded: ({ file, rows, headers }) => {
    parsedRows = rows;
    fileHeaders = headers;
    populateColumnMapping(file.name);
  },

  onError: err => {
    showBanner('err-banner', err.message);
  }
});

function normaliseHeader(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanEmail(value) {
  return String(value || '')
    .toLowerCase()
    .trim();
}

function populateColumnMapping(filename) {
  document.getElementById('file-badge-area').innerHTML = `
    <div class="file-badge">
      <span>${filename}</span>
      <span class="rm" onclick="resetChecker()">&times;</span>
    </div>
  `;

  const options = fileHeaders
    .map(h => `<option value="${h}">${h}</option>`)
    .join('');

  ['col-school', 'col-sid', 'col-email', 'col-alt'].forEach(id => {
    document.getElementById(id).innerHTML = options;
  });

  const guess = hints => {
    const normalisedHints = hints.map(normaliseHeader);

    return fileHeaders.find(header => {
      const h = normaliseHeader(header);
      return normalisedHints.some(hint => h.includes(hint));
    }) || fileHeaders[0];
  };

  document.getElementById('col-school').value = guess(['school name', 'school']);
  document.getElementById('col-sid').value = guess(['ft school id', 'school id', 'sid']);
  document.getElementById('col-email').value = guess(['e mail address', 'email address', 'e mail', 'email']);
  document.getElementById('col-alt').value = guess([
    'alternative e mail address',
    'alternative email address',
    'alt email',
    'alternative',
    'alt'
  ]);

  document.getElementById('card-config').classList.remove('hidden');
}

function runChecks() {
  hideBanner('err-banner');

  const colSchool = document.getElementById('col-school').value;
  const colSid = document.getElementById('col-sid').value;
  const colEmail = document.getElementById('col-email').value;
  const colAlt = document.getElementById('col-alt').value;

  const schoolCounters = {};

  const rows = parsedRows.map(row => {
    const sid = String(row[colSid] || '').trim();

    if (!schoolCounters[sid]) {
      schoolCounters[sid] = 0;
    }

    schoolCounters[sid] += 1;

    return {
      school: String(row[colSchool] || '').trim(),
      sid,
      email: cleanEmail(row[colEmail]),
      alt: cleanEmail(row[colAlt]),
      schoolRow: schoolCounters[sid]
    };
  });

  const issues = [];
  const seenIssueKeys = new Set();

  function rowLabel(row) {
    return row.schoolRow;
  }

  function addIssue(issue) {
    const key = [
      issue.sid,
      issue.school,
      issue.reason
    ].join('|');

    if (!seenIssueKeys.has(key)) {
      seenIssueKeys.add(key);
      issues.push(issue);
    }
  }

  rows.forEach((rowA, i) => {
    if (rowA.alt && rowA.alt === rowA.email) {
      addIssue({
        sid: rowA.sid,
        school: rowA.school,
        reason: `The alternate email is the same as the main email address on row ${rowLabel(rowA)}.`
      });
    }

    rows.forEach((rowB, j) => {
      if (i >= j) return;

      if (rowA.email && rowB.email && rowA.email === rowB.email) {
        if (rowA.sid === rowB.sid) {
          addIssue({
            sid: rowA.sid,
            school: rowA.school,
            reason: `Duplicate email addresses appear on rows ${rowLabel(rowA)} and ${rowLabel(rowB)}.`
          });
        } else {
          addIssue({
            sid: rowA.sid,
            school: rowA.school,
            reason: `An email address on row ${rowLabel(rowA)} also appears in another school's mailing list.`
          });

          addIssue({
            sid: rowB.sid,
            school: rowB.school,
            reason: `An email address on row ${rowLabel(rowB)} also appears in another school's mailing list.`
          });
        }
      }

      if (rowA.alt && rowB.email && rowA.alt === rowB.email) {
        if (rowA.sid === rowB.sid) {
          addIssue({
            sid: rowA.sid,
            school: rowA.school,
            reason: `The alternate email at row ${rowLabel(rowA)} is the same as the main email address at row ${rowLabel(rowB)}.`
          });
        } else {
          addIssue({
            sid: rowA.sid,
            school: rowA.school,
            reason: `An alternate email on row ${rowLabel(rowA)} also appears in another school's mailing list.`
          });
        }
      }

      if (rowB.alt && rowA.email && rowB.alt === rowA.email) {
        if (rowA.sid === rowB.sid) {
          addIssue({
            sid: rowB.sid,
            school: rowB.school,
            reason: `The alternate email at row ${rowLabel(rowB)} is the same as the main email address at row ${rowLabel(rowA)}.`
          });
        } else {
          addIssue({
            sid: rowB.sid,
            school: rowB.school,
            reason: `An alternate email on row ${rowLabel(rowB)} also appears in another school's mailing list.`
          });
        }
      }
    });
  });

  const grouped = {};

  issues.forEach(issue => {
    if (!grouped[issue.sid]) {
      grouped[issue.sid] = {
        school: issue.school,
        issues: []
      };
    }

    grouped[issue.sid].issues.push(issue.reason);
  });

  const emails = Object.entries(grouped).map(([sid, data]) => {
    const body =
`Dear All,

Thank you for uploading your alumni list. We are checking it.

Please could you check our queries below?

${data.issues.join('\n')}

Could you please correct it, review everything and upload the list again by the end of today? We will only send the alumni survey when your list is correct. Thanks.
`;

    return {
      sid,
      school: data.school,
      subject: `Alumni list - ${data.school}`,
      body
    };
  });

  renderCheckerResults({ issues, emails }, rows);
}

function renderCheckerResults(result, rows) {
  const { issues, emails } = result;

  document.getElementById('checker-upload-card').classList.add('hidden');
  document.getElementById('card-config').classList.add('hidden');
  document.getElementById('results-section').classList.remove('hidden');

  const totalSchools = new Set(rows.map(r => r.sid)).size;
  const affectedSchools = new Set(issues.map(i => i.sid)).size;

  document.getElementById('stats-row').innerHTML = `
    <div class="stat-box">
      <div class="n">${totalSchools}</div>
      <div class="lbl">Schools checked</div>
    </div>

    <div class="stat-box">
      <div class="n">${issues.length}</div>
      <div class="lbl">Issues found</div>
    </div>

    <div class="stat-box">
      <div class="n">${affectedSchools}</div>
      <div class="lbl">Schools affected</div>
    </div>
  `;

  const area = document.getElementById('results-area');

  if (!emails.length) {
    area.innerHTML = `
      <div class="banner banner-success">
        <span>No issues found — the alumni list looks clean.</span>
      </div>
    `;
    return;
  }

  area.innerHTML = emails.map((em, idx) => {
    const issueCount = issues.filter(i => i.sid === em.sid).length;

    return `
      <div class="result-card">
        <div class="result-header" onclick="toggleCheckerCard(${idx})">
          <span class="result-school">${em.school}</span>
          <span class="issue-badge">${issueCount} issue(s)</span>
        </div>

        <div class="result-body" id="checker-card-body-${idx}">
          <div class="subject-row">
            <div>
              <div class="email-subject-label">Subject</div>
              <div class="email-subject-val" id="checker-email-subject-${idx}">${em.subject}</div>
            </div>

            <button class="btn-secondary copy-btn" onclick="copyCheckerSubject(event, ${idx})">
              Copy subject
            </button>
          </div>

          <div class="email-box">
            <button class="btn-secondary copy-email-btn" onclick="copyCheckerBody(event, ${idx})">
              Copy email
            </button>

            <div class="email-pre" id="checker-email-pre-${idx}">${em.body}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleCheckerCard(idx) {
  const body = document.getElementById('checker-card-body-' + idx);

  body.style.display =
    body.style.display === 'none'
      ? ''
      : 'none';
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);

    const original = button.textContent;
    button.textContent = 'Copied!';
    button.disabled = true;

    setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, 1500);
  } catch (e) {
    showBanner('err-banner', 'Could not copy to clipboard.');
  }
}

function copyCheckerSubject(event, idx) {
  event.stopPropagation();

  const subject = document.getElementById('checker-email-subject-' + idx).textContent;
  copyText(subject, event.currentTarget);
}

function copyCheckerBody(event, idx) {
  event.stopPropagation();

  const body = document.getElementById('checker-email-pre-' + idx).textContent;
  copyText(body, event.currentTarget);
}

function resetChecker() {
  parsedRows = [];
  fileHeaders = [];

  document.getElementById('checker-file-input').value = '';
  document.getElementById('file-badge-area').innerHTML = '';
  document.getElementById('run-btn').disabled = false;
  document.getElementById('status-bar').classList.add('hidden');
  document.getElementById('results-section').classList.add('hidden');
  document.getElementById('results-area').innerHTML = '';
  document.getElementById('stats-row').innerHTML = '';
  document.getElementById('checker-upload-card').classList.remove('hidden');
  document.getElementById('card-config').classList.add('hidden');

  hideBanner('err-banner');
}