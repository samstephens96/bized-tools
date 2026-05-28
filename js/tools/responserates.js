let responseRateRows = [];
let responseRateHeaders = [];
let latestResponseRatesRows = [];
let responseRatesSummaryOpen = true;

setupSpreadsheetUpload({
  dropZoneId: 'responserates-drop-zone',
  fileInputId: 'responserates-file-input',

  onStart: () => {
    document.getElementById('responserates-upload-card').classList.add('hidden');

    document.getElementById('responserates-results-section').classList.remove('hidden');

    document.getElementById('responserates-stats-row').innerHTML = '';

    document.getElementById('responserates-results-area').innerHTML = `
      <div class="card loading-card">
        <div class="spinner"></div>
        <span>Loading spreadsheet…</span>
      </div>
    `;
  },

  onLoaded: ({ file, rows, headers }) => {
    responseRateRows = rows;
    responseRateHeaders = headers;

    buildResponseRatesApp();
  },

  onError: err => {
    alert(err.message);
  }
});

function buildResponseRatesApp() {
  const sidColumn = responseRateHeaders.find(h => h.includes('§school_id.'));
  const schoolColumn = responseRateHeaders.find(h => h.includes('§school_name'));
  const campaignStatusColumn = responseRateHeaders.find(h => h.includes('Campaign Status'));

  if (!sidColumn || !schoolColumn || !campaignStatusColumn) {
    alert('Could not find sid, school, or campaign status columns.');
    return;
  }

  const grouped = {};

  responseRateRows.forEach(row => {
    const sid = row[sidColumn];
    const school = row[schoolColumn];
    const campaignStatus = row[campaignStatusColumn];

    if (!grouped[sid]) {
      grouped[sid] = {
        sid,
        school,
        responses: 0
      };
    }

    if (campaignStatus === 'Completed') {
      grouped[sid].responses += 1;
    }
  });

  const finalRows = Object.values(grouped).map(row => ({
    Sid: row.sid,
    'School Name': row.school,
    'Total responses': row.responses
  }));

  finalRows.push({
    Sid: 1000,
    'School Name': 'Test School',
    'Total responses': 42
  });

  renderResponseRates(finalRows);
}

function renderResponseRates(rows) {
  latestResponseRatesRows = rows;
  responseRatesSummaryOpen = true;
  document.getElementById('responserates-upload-card').classList.add('hidden');
  document.getElementById('responserates-results-section').classList.remove('hidden');

  document.getElementById('responserates-results-section').classList.remove('hidden');

  const totalSchools = rows.length;
  const totalResponses = rows.reduce((sum, row) => {
    return sum + Number(row['Total responses'] || 0);
  }, 0);

  document.getElementById('responserates-stats-row').innerHTML = `
    <div class="stat-box">
      <div class="n">${totalSchools}</div>
      <div class="lbl">Schools</div>
    </div>

    <div class="stat-box">
      <div class="n">${totalResponses}</div>
      <div class="lbl">Total responses</div>
    </div>

    <div class="stat-box stat-btn-box" onclick="resetResponseRates()">
      <div class="n">↺</div>
      <div class="lbl">Start over</div>
    </div>
  `;

  document.getElementById('responserates-results-area').innerHTML = `
    <div class="result-card">
      <div class="result-header" onclick="toggleResponseRatesSummary()">
        <span class="result-school">Response rates summary</span>

        <button class="btn-secondary" onclick="downloadResponseRatesCsv(event)">
          Download CSV
        </button>
      </div>

      <div class="result-body" id="responserates-summary-body">
        <table class="results-table">
          <thead>
            <tr>
              <th>Sid</th>
              <th>School Name</th>
              <th>Total responses</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <td>${row.Sid}</td>
                <td>${row['School Name']}</td>
                <td>${row['Total responses']}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function downloadResponseRatesCsv(event) {
  event.stopPropagation();
  if (!latestResponseRatesRows.length) {
    alert('No response rates data to download.');
    return;
  }
  const headers = ['Sid', 'School Name', 'Total responses'];
  const csvRows = [
    headers.join(','),
    ...latestResponseRatesRows.map(row =>
      headers.map(header => csvEscape(row[header])).join(',')
    )
  ];
  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'response-rates.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function showResponseRatesLoading() {
  document.getElementById('responserates-results-section').classList.remove('hidden');

  document.getElementById('responserates-stats-row').innerHTML = '';

  document.getElementById('responserates-results-area').innerHTML = `
    <div class="card loading-card">
      <div class="spinner"></div>
      <span>Building response rates summary…</span>
    </div>
  `;
}

function toggleResponseRatesSummary() {
  const body = document.getElementById('responserates-summary-body');

  responseRatesSummaryOpen = !responseRatesSummaryOpen;

  body.style.display = responseRatesSummaryOpen ? '' : 'none';
}

function resetResponseRates() {
  responseRateRows = [];
  responseRateHeaders = [];
  latestResponseRatesRows = [];

  document.getElementById('responserates-file-input').value = '';

  document.getElementById('responserates-upload-card').classList.remove('hidden');

  document.getElementById('responserates-results-section').classList.add('hidden');

  document.getElementById('responserates-results-area').innerHTML = '';

  document.getElementById('responserates-stats-row').innerHTML = '';
}