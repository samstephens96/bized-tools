let dataCheckEmailData = null;
let dataCheckEmailResults = null;

function dataCheckEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resetDataCheckEmails() {
  dataCheckEmailData = null;
  dataCheckEmailResults = null;
  document.getElementById('datacheckemails-file-input').value = '';
  document.getElementById('datacheckemails-file-badge-area').innerHTML = '';
  document.getElementById('datacheckemails-config-card').classList.add('hidden');
  document.getElementById('datacheckemails-results-section').classList.add('hidden');
  document.getElementById('datacheckemails-results').innerHTML = '';
  document.getElementById('datacheckemails-stats-row').innerHTML = '';
  hideBanner('datacheckemails-err-banner');
}

setupSpreadsheetUpload({
  dropZoneId: 'datacheckemails-drop-zone',
  fileInputId: 'datacheckemails-file-input',

  onLoaded: ({ file, rows, headers }) => {
    dataCheckEmailData = [headers, ...rows];

    document.getElementById('datacheckemails-file-badge-area').innerHTML = `
      <div class="file-badge">
        <span>${dataCheckEscapeHtml(file.name)}</span>
        <span class="rm" onclick="resetDataCheckEmails()">&times;</span>
      </div>
    `;

    document.getElementById('datacheckemails-upload-card').classList.add('hidden');
    document.getElementById('datacheckemails-config-card').classList.remove('hidden');
    hideBanner('datacheckemails-err-banner');
  },

  onError: err => {
    console.error(err);
    showBanner('datacheckemails-err-banner', err.message);
  }
});

function generateDataCheckEmails() {
  hideBanner('datacheckemails-err-banner');

  if (!dataCheckEmailData || dataCheckEmailData.length < 3) {
    showBanner('datacheckemails-err-banner', 'Please upload a data file first.');
    return;
  }

  const ranking = document.getElementById('datacheckemails-ranking').value;
  const year = document.getElementById('datacheckemails-year').value;
  const link = document.getElementById('datacheckemails-link').value.trim();
  const deadlineValue = document.getElementById('datacheckemails-deadline').value;

  if (!ranking || !year || !link || !deadlineValue) {
    showBanner('datacheckemails-err-banner', 'Please complete ranking, year, timeline link and deadline.');
    return;
  }

  const deadline = new Date(`${deadlineValue}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const questionText = dataCheckEmailData[0];
  const fieldNames = dataCheckEmailData[1];
  const schoolIndex = fieldNames.findIndex(x => String(x ?? '').trim() === 'school_name');

  if (schoolIndex === -1) {
    showBanner('datacheckemails-err-banner', 'Could not find school_name in the first data row.');
    return;
  }

  const rows = dataCheckEmailData.slice(2);
  const checkIndexes = Array.from(
    { length: fieldNames.length - schoolIndex - 1 },
    (_, i) => schoolIndex + i + 1
  );

  dataCheckEmailResults = rows
    .filter(row => row.some(value => value !== null && value !== undefined && String(value).trim() !== ''))
    .map(row => {
      const checks = checkIndexes
        .filter(i => row[i] !== null && row[i] !== undefined && String(row[i]).trim() !== '')
        .map(i => String(fieldNames[i] ?? '').startsWith('criteria_grad')
          ? String(row[i])
          : String(questionText[i] ?? ''));

      const emailBody = `Dear All,\n\nThank you for completing the survey for the FT ${ranking} ranking ${year}. We are checking your data.\n\nPlease could you confirm your answers to these questions by email by ${deadline}?\n\n${checks.join('\n\n')}\n\nPlease make any changes in your online survey and email us exactly what these changes are, so they do not get missed. Review your whole survey again online, which can be found on the ${ranking} timeline: ${link}.\n`;

      return { school_name: row[schoolIndex], email_body: emailBody };
    });

  renderDataCheckEmailResults();
}

function renderDataCheckEmailResults() {
  const section = document.getElementById('datacheckemails-results-section');
  const stats = document.getElementById('datacheckemails-stats-row');
  const container = document.getElementById('datacheckemails-results');

  section.classList.remove('hidden');
  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${dataCheckEmailResults.length}</div>
      <div class="stat-label">Emails generated</div>
    </div>
  `;

  container.innerHTML = `
    <div class="card">
      <p class="section-label">Generated emails</p>
      <button type="button" class="btn-primary" onclick="downloadDataCheckEmails()">
        Download emails
      </button>
    </div>
  `;
}

function downloadDataCheckEmails() {
  if (!dataCheckEmailResults?.length) return;
  const worksheet = XLSX.utils.json_to_sheet(dataCheckEmailResults);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data check emails');
  XLSX.writeFile(workbook, 'data_check_emails.xlsx');
}
