let dataCheckEmailData = null;
let dataCheckEmailResults = null;

async function handleDataCheckEmailUpload(input) {
  const file = input.files[0];

  if (!file) return;

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    dataCheckEmailData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      raw: false
    });

    document.getElementById('datacheckemails-file-name').textContent =
      `${file.name} loaded`;

  } catch (error) {
    console.error(error);
    alert('Could not read the uploaded file.');
  }
}


function generateDataCheckEmails() {
  if (!dataCheckEmailData || dataCheckEmailData.length < 2) {
    alert('Please upload a data file first.');
    return;
  }

  const ranking = document.getElementById('datacheckemails-ranking').value;
  const year = document.getElementById('datacheckemails-year').value;
  const link = document.getElementById('datacheckemails-link').value.trim();
  const deadline = document.getElementById('datacheckemails-deadline').value.trim();

  /*
   * Equivalent to:
   *
   * question_row = df.loc[0]
   * check_dict = dict(zip(question_row, df.columns))
   * df = df.drop(0)
   * df.columns = question_row
   */

  const questionText = dataCheckEmailData[0];
  const fieldNames = dataCheckEmailData[1];

  const schoolIndex = fieldNames.indexOf('school_name');

  if (schoolIndex === -1) {
    alert('Could not find school_name in the first data row.');
    return;
  }

  const checkIndexes = [];

  for (let i = schoolIndex + 1; i < fieldNames.length; i++) {
    checkIndexes.push(i);
  }

  const rows = dataCheckEmailData.slice(2);

  dataCheckEmailResults = rows
    .filter(row => row.some(value =>
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ''
    ))
    .map(row => {
      const schoolName = row[schoolIndex];

      const checks = checkIndexes
        .filter(i => {
          const value = row[i];

          return (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ''
          );
        })
        .map(i => {
          const fieldName = String(fieldNames[i] ?? '');

          /*
           * Python:
           *
           * f"{row[col]}"
           * if str(col).startswith('criteria_grad')
           * else check_dict[col]
           */

          if (fieldName.startsWith('criteria_grad')) {
            return String(row[i]);
          }

          return String(questionText[i] ?? '');
        });

      const questions = checks.join('\n\n');

      const emailBody =
`Dear All,

Thank you for completing the survey for the FT ${ranking} ranking ${year}. We are checking your data.

Please could you confirm your answers to these questions by email by ${deadline}?

${questions}

Please make any changes in your online survey and email us exactly what these changes are, so they do not get missed. Review your whole survey again online, which can be found on the ${ranking} timeline: ${link}.
`;

      return {
        school_name: schoolName,
        email_body: emailBody
      };
    });

  renderDataCheckEmailResults();
}


function renderDataCheckEmailResults() {
  const container = document.getElementById('datacheckemails-results');

  if (!container) return;

  if (!dataCheckEmailResults?.length) {
    container.innerHTML = '<p>No emails generated.</p>';
    return;
  }

  container.innerHTML = `
    <div class="result-summary">
      ${dataCheckEmailResults.length} emails generated
    </div>

    <button
      type="button"
      class="primary-btn"
      onclick="downloadDataCheckEmails()">
      Download emails
    </button>
  `;
}


function downloadDataCheckEmails() {
  if (!dataCheckEmailResults?.length) return;

  const worksheet = XLSX.utils.json_to_sheet(dataCheckEmailResults);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Data check emails'
  );

  XLSX.writeFile(
    workbook,
    'data_check_emails.xlsx'
  );
}
