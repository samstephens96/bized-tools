let facultyRows = [];
let facultyHeaders = [];
let facultySchoolRows = [];
let facultySchoolHeaders = [];
let latestFacultyEmails = [];
let facultyAsiaDuplicates = [];
let facultyRemovedDuplicateNames = new Set();
let latestFacultyResults = [];

function facultyNormaliseHeader(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function facultyNormaliseSid(value) {
  return String(value || '').trim().replace(/\.0$/, '');
}

function facultyEscapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function facultyTitle(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function facultyStripAccents(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function facultyGuess(headers, hints) {
  const normalisedHints = hints.map(facultyNormaliseHeader);

  return headers.find(header => {
    const h = facultyNormaliseHeader(header);
    return normalisedHints.some(hint => h.includes(hint));
  }) || headers[0];
}

function populateFacultyFileBadge(filename) {
  document.getElementById('facultychecker-file-badge-area').innerHTML = `
    <div class="file-badge">
      <span>${facultyEscapeHtml(filename)}</span>
      <span class="rm" onclick="resetFacultyChecker()">&times;</span>
    </div>
  `;
}

function populateFacultyColumnMapping(schoolFilename) {
  document.getElementById('facultychecker-school-file-badge-area').innerHTML = `
    <div class="file-badge">
      <span>${facultyEscapeHtml(schoolFilename)}</span>
      <span class="rm" onclick="resetFacultyChecker()">&times;</span>
    </div>
  `;

  const facultyOptions = facultyHeaders
    .map(h => `<option value="${facultyEscapeHtml(h)}">${facultyEscapeHtml(h)}</option>`)
    .join('');

  const schoolOptions = facultySchoolHeaders
    .map(h => `<option value="${facultyEscapeHtml(h)}">${facultyEscapeHtml(h)}</option>`)
    .join('');

  [
    'facultychecker-col-sid',
    'facultychecker-col-school',
    'facultychecker-col-first',
    'facultychecker-col-surname',
    'facultychecker-col-middle',
    'facultychecker-col-orcid'
  ].forEach(id => {
    document.getElementById(id).innerHTML = facultyOptions;
  });

  [
    'facultychecker-school-col-sid',
    'facultychecker-school-col-name',
    'facultychecker-school-col-faculty'
  ].forEach(id => {
    document.getElementById(id).innerHTML = schoolOptions;
  });

  document.getElementById('facultychecker-col-sid').value = facultyGuess(facultyHeaders, ['ft school id', 'school id', 'sid']);
  document.getElementById('facultychecker-col-school').value = facultyGuess(facultyHeaders, ['school name', 'school']);
  document.getElementById('facultychecker-col-first').value = facultyGuess(facultyHeaders, ['first name', 'first']);
  document.getElementById('facultychecker-col-surname').value = facultyGuess(facultyHeaders, ['surname family name', 'surname', 'family name', 'last name']);
  document.getElementById('facultychecker-col-middle').value = facultyGuess(facultyHeaders, ['middle initials', 'middle initial', 'middle']);
  document.getElementById('facultychecker-col-orcid').value = facultyGuess(facultyHeaders, ['orcid']);

    document.getElementById('facultychecker-school-col-sid').value =
    facultyGuess(facultySchoolHeaders, ['sid', 'ft school id']);

  document.getElementById('facultychecker-school-col-name').value =
    facultyGuess(facultySchoolHeaders, ['school name']);

  document.getElementById('facultychecker-school-col-faculty').value =
    facultyGuess(facultySchoolHeaders, ['faculty']);

  document.getElementById('facultychecker-school-upload-card').classList.add('hidden');
  document.getElementById('facultychecker-config-card').classList.remove('hidden');
}

function resetFacultyChecker() {
  facultyRows = [];
  facultyHeaders = [];
  facultySchoolRows = [];
  facultySchoolHeaders = [];
  latestFacultyEmails = [];
  facultyAsiaDuplicates = [];
  facultyRemovedDuplicateNames = new Set();
  latestFacultyResults = [];

  [
    'facultychecker-upload-card',
    'facultychecker-school-upload-card'
  ].forEach(id => document.getElementById(id).classList.add('hidden'));

  document.getElementById('facultychecker-upload-card').classList.remove('hidden');

  document.getElementById('facultychecker-config-card').classList.add('hidden');
  document.getElementById('facultychecker-results-section').classList.add('hidden');

  document.getElementById('facultychecker-file-input').value = '';
  document.getElementById('facultychecker-school-file-input').value = '';
}

function facultyAddCheck(store, sid, schoolName, reason) {

  if (!store[sid]) {
    store[sid] = {
      schoolName,
      reasons: []
    };
  }

  if (!store[sid].reasons.includes(reason)) {
    store[sid].reasons.push(reason);
  }
}

function cleanMiddle(value) {

  if (value === undefined || value === null || value === '') return '';

  value = facultyStripAccents(String(value))
    .replace(/[a-z]/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, '')
    .trim();

  if (value.length > 4) value = value[0];

  if (!value.length) return '';

  if (value.length === 1) return value + '.';

  return value.split('').join('.') + '.';
}

function cleanOrcid(value) {

  if (!value) return '';

  value = String(value).trim();

  const invalid = [
    'NOPE',
    'No ORCID',
    'unidentifyable',
    '-',
    '.'
  ];

  if (invalid.includes(value)) return '';

  value = value
    .replace('https://orcid.org/', '')
    .replace(/\s+/g, '');

  if (value.startsWith('000-'))
    value = '0' + value;

  return value;
}

function runFacultyChecks() {

  hideBanner('facultychecker-err-banner');

  const cols = {

    sid: document.getElementById('facultychecker-col-sid').value,
    school: document.getElementById('facultychecker-col-school').value,
    first: document.getElementById('facultychecker-col-first').value,
    surname: document.getElementById('facultychecker-col-surname').value,
    middle: document.getElementById('facultychecker-col-middle').value,
    orcid: document.getElementById('facultychecker-col-orcid').value,

    schoolSid: document.getElementById('facultychecker-school-col-sid').value,
    schoolName: document.getElementById('facultychecker-school-col-name').value,
    schoolFaculty: document.getElementById('facultychecker-school-col-faculty').value
  };

  const checks = {};

  const schoolMap = {};

  facultySchoolRows.forEach(row => {

    schoolMap[facultyNormaliseSid(row[cols.schoolSid])] = {

      name: row[cols.schoolName],

      faculty: Number(row[cols.schoolFaculty])
    };

  });

  const counts = {};

  facultyRows.forEach(row => {

    const sid = facultyNormaliseSid(row[cols.sid]);

    counts[sid] = (counts[sid] || 0) + 1;

  });

  Object.keys(counts).forEach(sid => {

    const school = schoolMap[sid];

    if (!school) return;

    if (counts[sid] !== school.faculty) {

      facultyAddCheck(
        checks,
        sid,
        school.name,
        'The number of faculty in your faculty list does not match the number of faculty reported in the survey.'
      );

    }

  });

  const grouped = {};

  facultyRows.forEach(row => {

    const fullName =
      facultyTitle(row[cols.first]) +
      ' ' +
      facultyTitle(row[cols.surname]);

    if (!grouped[fullName])
      grouped[fullName] = [];

    grouped[fullName].push({
      sid: facultyNormaliseSid(row[cols.sid]),
      school: row[cols.school],
      middle: cleanMiddle(row[cols.middle]),
      orcid: cleanOrcid(row[cols.orcid]),
      fullName
    });

  });

facultyAsiaDuplicates = [];

Object.keys(grouped).forEach(fullName => {

  const rows = grouped[fullName];

  if (rows.length <= 1) return;

  const middleValues = rows.map(r => r.middle).filter(Boolean);
  const orcidValues = rows.map(r => r.orcid).filter(Boolean);

  const allHaveMiddle = middleValues.length === rows.length;
  const allHaveOrcid = orcidValues.length === rows.length;

  const uniqueMiddle = [...new Set(middleValues)];
  const uniqueOrcid = [...new Set(orcidValues)];

  if (allHaveMiddle && uniqueMiddle.length === rows.length) return;
  if (allHaveOrcid && uniqueOrcid.length === rows.length) return;

  const hasAsianSurname = rows.some(r => {
    const parts = r.fullName.split(' ');
    const surname = parts[parts.length - 1];
    return facultyAsianSurnames.includes(surname);
  });

  const schoolNames = [...new Set(
    rows.map(r => {
      const school = schoolMap[r.sid];
      return school ? school.name : r.school;
    }).filter(Boolean)
  )].sort();

  if (
      hasAsianSurname &&
      !facultyRemovedDuplicateNames.has(fullName)
  ) {
      facultyAsiaDuplicates.push({
          fullName,
          schools: schoolNames,
          rows
      });
  }

  if (facultyRemovedDuplicateNames.has(fullName)) return;

    const uniqueSids = [...new Set(rows.map(r => r.sid))];

    rows.forEach(row => {
      const school = schoolMap[row.sid];
      const currentSchoolName = school ? school.name : row.school;

      let thisReason;

      if (uniqueSids.length === 1) {
        thisReason =
          `The faculty name "${fullName}" appears more than once in your faculty list.`;
      } else {
        const otherSchoolNames = schoolNames.filter(
          name => name !== currentSchoolName
        );

        thisReason =
          `The faculty name "${fullName}" appears in another school's faculty list. ` +
          `It appears in the list of the following school(s): ${otherSchoolNames.join(', ')}.`;
      }

      facultyAddCheck(
        checks,
        row.sid,
        currentSchoolName,
        thisReason
      );
    });

    });

  const results = Object.keys(checks)
    .sort((a, b) => String(checks[a].schoolName).localeCompare(String(checks[b].schoolName)))
    .map(sid => ({
      sid,
      schoolName: checks[sid].schoolName,
      reasons: checks[sid].reasons
    }));

  latestFacultyResults = results;
  renderFacultyResults(results);
}

function renderFacultyResults(results) {
  document.getElementById('facultychecker-upload-card').classList.add('hidden');
  document.getElementById('facultychecker-school-upload-card').classList.add('hidden');
  document.getElementById('facultychecker-config-card').classList.add('hidden');
  document.getElementById('facultychecker-results-section').classList.remove('hidden');

  const totalSchools = new Set(facultyRows.map(row => {
    const sidCol = document.getElementById('facultychecker-col-sid').value;
    return facultyNormaliseSid(row[sidCol]);
  })).size;

  const totalIssues = results.reduce((sum, r) => sum + r.reasons.length, 0);
  document.getElementById('facultychecker-stats-row').innerHTML = `
    <div class="stat-box">
      <div class="n">${totalSchools}</div>
      <div class="lbl">Schools checked</div>
    </div>

    <div class="stat-box">
      <div class="n">${totalIssues}</div>
      <div class="lbl">Issues found</div>
    </div>

    <div class="stat-box">
      <div class="n">${results.length}</div>
      <div class="lbl">Schools affected</div>
    </div>

    <div class="stat-box stat-btn-box" onclick="resetFacultyChecker()">
      <div class="n">↺</div>
      <div class="lbl">Start over</div>
    </div>
  `;
  const area = document.getElementById('facultychecker-results-area');
  const asiaHtml = renderFacultyAsiaDuplicateReview();
  if (!results.length) {
    area.innerHTML = `
      <div class="banner banner-success">
        <span>No issues found — the faculty list looks clean.</span>
      </div>
    `;
    return;

  }

  latestFacultyEmails = results.map(result => {
    return {
      sid: result.sid,
      schoolName: result.schoolName,
      subject: `Faculty list - ${result.schoolName}`,
      body: buildFacultyEmailBody(result),
      issueCount: result.reasons.length
    };

  });

  area.innerHTML = asiaHtml + latestFacultyEmails.map((em, idx) => `
    <div class="result-card">
      <div class="result-header" onclick="toggleFacultyCard(${idx})">
        <span class="result-school">${facultyEscapeHtml(em.schoolName || em.sid)}</span>
        <span class="issue-badge">${em.issueCount} issue(s)</span>
      </div>

      <div class="result-body" id="facultychecker-card-body-${idx}" style="display:none;">
        <div class="subject-row">
          <div>
            <div class="email-subject-label">Subject</div>
            <div class="email-subject-val" id="facultychecker-email-subject-${idx}">
              ${facultyEscapeHtml(em.subject)}
            </div>
          </div>
          <button class="btn-secondary copy-btn" onclick="copyFacultySubject(event, ${idx})">
            Copy subject
          </button>
        </div>

        <div class="email-box">
          <button class="btn-secondary copy-email-btn" onclick="copyFacultyBody(event, ${idx})">
            Copy email
          </button>
          <div class="email-pre" id="facultychecker-email-pre-${idx}">
            ${facultyEscapeHtml(em.body)}
          </div>
        </div>
      </div>
    </div>
  `).join('');

}

function buildFacultyEmailBody(result) {

  const bulletList = result.reasons
    .map(reason => `- ${reason}`)
    .join('\n');

  return `Dear All,

During our checks of your submitted faculty list, we found the following issue(s):

${bulletList}

Please review your faculty list and update it if necessary.

Kind regards,
FT rankings team`;
}

function toggleFacultyCard(idx) {
  const body = document.getElementById('facultychecker-card-body-' + idx);

  if (!body) return;

  body.style.display =
    body.style.display === 'none'
      ? 'block'
      : 'none';
}

async function copyFacultyText(text, button) {
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
    alert('Could not copy to clipboard.');
  }
}

function copyFacultySubject(event, idx) {
  event.stopPropagation();
  const subject = document.getElementById('facultychecker-email-subject-' + idx).textContent.trim();
  copyFacultyText(subject, event.currentTarget);
}

function copyFacultyBody(event, idx) {
  event.stopPropagation();
  const body = document.getElementById('facultychecker-email-pre-' + idx).textContent.trim();
  copyFacultyText(body, event.currentTarget);
}

function copyFacultyName(name, button) {
  copyFacultyText(name, button);
}

function renderFacultyAsiaDuplicateReview() {

  if (!facultyAsiaDuplicates.length) return '';

  return `
    <div class="result-card">

      <div class="result-header" onclick="toggleAsiaReview()">
        <span class="result-school">
          Potential duplicates
        </span>

        <span class="issue-badge">
          ${facultyAsiaDuplicates.length} remaining
        </span>
      </div>

      <div
        class="result-body"
        id="faculty-asia-review-body"
        style="display:block;"
      >

        <div style="padding:18px">

          <p class="helper-text" style="margin-top:0">
            Tick names that should <strong>not</strong> generate duplicate-name
            emails, then click Update.
          </p>

          <div class="asia-review-list">

          ${facultyAsiaDuplicates.map(item => `

          <div class="asia-review-row">

            <div class="asia-review-main">
              <div class="asia-review-name">
                ${facultyEscapeHtml(item.fullName)}
              </div>

              <div class="asia-review-schools">
                ${facultyEscapeHtml(item.schools.join(', '))}
              </div>
            </div>

            <div class="asia-review-actions">

              <button
                type="button"
                class="copy-name-btn"
                onclick="event.preventDefault();event.stopPropagation();copyFacultyName('${facultyEscapeHtml(item.fullName)}',this);">
                Copy name
              </button>

              <label class="remove-check">
                <input
                  type="checkbox"
                  data-full-name="${facultyEscapeHtml(item.fullName)}">
                Remove
              </label>

            </div>

          </div>

          `).join('')}

          </div>

          <div style="margin-top:18px;text-align:right">
            <button
              class="btn-primary"
              onclick="event.stopPropagation();updateFacultyDuplicateEmails();">
              Update duplicate emails
            </button>
          </div>

        </div>

      </div>

    </div>
  `;
}

function toggleAsiaReview() {

    const body = document.getElementById("faculty-asia-review-body");

    if (!body) return;

    body.style.display =
        body.style.display === "none"
            ? "block"
            : "none";
}

function updateFacultyDuplicateEmails() {
  document
    .querySelectorAll('.asia-review-action input[type="checkbox"]:checked')
    .forEach(box => {
      facultyRemovedDuplicateNames.add(box.dataset.fullName);
    });

  facultyAsiaDuplicates = facultyAsiaDuplicates.filter(
    item => !facultyRemovedDuplicateNames.has(item.fullName)
  );

  latestFacultyResults = latestFacultyResults
    .map(result => {
      const reasons = result.reasons.filter(reason => {
        return ![...facultyRemovedDuplicateNames].some(name =>
          reason.includes(`"${name}"`)
        );
      });

      return {
        ...result,
        reasons
      };
    })
    .filter(result => result.reasons.length > 0);

  renderFacultyResults(latestFacultyResults);
}

const facultyAsianSurnames = [
  'Ai', 'An', 'Bai', 'Bao', 'Cai', 'Cao', 'Chang', 'Chao', 'Chen',
  'Cheng', 'Chi', 'Chiu', 'Chu', 'Cui', 'Dai', 'Deng', 'Ding',
  'Dong', 'Du', 'Fan', 'Fang', 'Feng', 'Fu', 'Gao', 'Gong',
  'Gu', 'Guan', 'Guo', 'Han', 'He', 'Hou', 'Hu', 'Hua', 'Huang',
  'Jia', 'Jiang', 'Jin', 'Kong', 'Lei', 'Li', 'Liang', 'Liao',
  'Lin', 'Ling', 'Liu', 'Long', 'Lou', 'Lu', 'Luo', 'Ma', 'Meng',
  'Mo', 'Ni', 'Ning', 'Ou', 'Pan', 'Peng', 'Qian', 'Qiao', 'Qin',
  'Qiu', 'Ren', 'Shao', 'Shen', 'Shi', 'Song', 'Su', 'Sun', 'Tan',
  'Tang', 'Tao', 'Tian', 'Tong', 'Wan', 'Wang', 'Wei', 'Wen',
  'Wu', 'Xia', 'Xiang', 'Xiao', 'Xie', 'Xin', 'Xiong', 'Xu',
  'Xue', 'Yan', 'Yang', 'Yao', 'Ye', 'Yi', 'Yin', 'Yu', 'Yuan',
  'Yue', 'Yun', 'Zeng', 'Zhai', 'Zhan', 'Zhang', 'Zhao', 'Zhen',
  'Zheng', 'Zhong', 'Zhou', 'Zhu', 'Zou',

  'Bae', 'Baek', 'Cha', 'Chae', 'Cho', 'Choi', 'Chung', 'Hong',
  'Hwang', 'Jang', 'Jeon', 'Jeong', 'Jo', 'Jung', 'Kang', 'Kim',
  'Koo', 'Kwon', 'Lee', 'Lim', 'Moon', 'Na', 'Nam', 'Oh', 'Park',
  'Ryu', 'Seo', 'Shin', 'Yoon',

  'Abe', 'Endo', 'Fujii', 'Fujimoto', 'Fujita', 'Fukuda', 'Goto',
  'Hayashi', 'Hirano', 'Honda', 'Ikeda', 'Ishida', 'Ishii',
  'Ito', 'Kato', 'Kobayashi', 'Kojima', 'Maeda', 'Matsumoto',
  'Mori', 'Murakami', 'Nakamura', 'Nakayama', 'Ogawa', 'Okada',
  'Saito', 'Sakai', 'Sasaki', 'Shimizu', 'Sugimoto', 'Suzuki',
  'Takahashi', 'Tanaka', 'Ueda', 'Watanabe', 'Yamada', 'Yamamoto',
  'Yamashita', 'Yoshida',

  'Bui', 'Dang', 'Dao', 'Do', 'Dinh', 'Duong', 'Ho', 'Huynh',
  'Le', 'Ly', 'Mai', 'Ngo', 'Nguyen', 'Pham', 'Phan', 'Tran',
  'Trinh', 'Truong', 'Vo', 'Vu'
];

function getFacultyAsianSurnameRows(cols) {

  return facultyRows.filter(row => {
    const surname = facultyTitle(row[cols.surname]);
    return facultyAsianSurnames.includes(surname);
  });

}
console.log('facultychecker.js loaded');

const facultyDropZone = document.getElementById('facultychecker-drop-zone');
const facultyInput = document.getElementById('facultychecker-file-input');

console.log('faculty drop zone:', facultyDropZone);
console.log('faculty input:', facultyInput);

setupSpreadsheetUpload({
  dropZoneId: 'facultychecker-drop-zone',
  fileInputId: 'facultychecker-file-input',

  onLoaded: ({ file, rows, headers }) => {
    console.log('faculty file loaded', file.name);

    facultyRows = rows;
    facultyHeaders = headers;
    populateFacultyFileBadge(file.name);
    document.getElementById('facultychecker-upload-card').classList.add('hidden');
    document.getElementById('facultychecker-school-upload-card').classList.remove('hidden');
  },

  onError: err => {
    console.error(err);
    showBanner('facultychecker-err-banner', err.message);
  }
});

setupSpreadsheetUpload({
  dropZoneId: 'facultychecker-school-drop-zone',
  fileInputId: 'facultychecker-school-file-input',

  onLoaded: ({ file, rows, headers }) => {
    console.log('faculty school file loaded', file.name);

    facultySchoolRows = rows;
    facultySchoolHeaders = headers;
    populateFacultyColumnMapping(file.name);
  },

  onError: err => {
    console.error(err);
    showBanner('facultychecker-err-banner', err.message);
  }
});