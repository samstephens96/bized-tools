/* ============================================================
   DATA CHECK EMAILS
   ============================================================ */

let dataCheckEmailData = null;
let dataCheckEmailResults = null;


/* ------------------------------------------------------------
   Helpers
   ------------------------------------------------------------ */

function escapeDataCheckHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function dataCheckValuePresent(value) {
  return (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== ''
  );
}


function showDataCheckError(message) {
  const banner = document.getElementById(
    'datacheckemails-err-banner'
  );

  const text = document.getElementById(
    'datacheckemails-err-text'
  );

  if (!banner || !text) {
    alert(message);
    return;
  }

  text.textContent = message;
  banner.classList.remove('hidden');
}


function hideDataCheckError() {
  const banner = document.getElementById(
    'datacheckemails-err-banner'
  );

  if (banner) {
    banner.classList.add('hidden');
  }
}


/* ------------------------------------------------------------
   Spreadsheet upload

   Uses the same shared upload system as the other tools.
   ------------------------------------------------------------ */

setupSpreadsheetUpload({
  dropZoneId: 'datacheckemails-drop-zone',
  fileInputId: 'datacheckemails-file',

  onStart: () => {
    hideDataCheckError();

    const zone = document.getElementById(
      'datacheckemails-drop-zone'
    );

    if (zone) {
      zone.classList.add('loading');
    }
  },

  onLoaded: (data, file) => {
    const zone = document.getElementById(
      'datacheckemails-drop-zone'
    );

    if (zone) {
      zone.classList.remove('loading');
    }

    /*
      setupSpreadsheetUpload returns the spreadsheet data.
      Keep it exactly as supplied so that we retain:

      Row 0 = Excel column headings / question text
      Row 1 = internal field names
      Row 2+ = school data
    */

    dataCheckEmailData = data;
    dataCheckEmailResults = null;

    const badgeArea = document.getElementById(
      'datacheckemails-file-badge-area'
    );

    if (badgeArea) {
      badgeArea.innerHTML = `
        <div class="file-badge">
          ${escapeDataCheckHtml(file.name)}
        </div>
      `;
    }

    const uploadCard = document.getElementById(
      'datacheckemails-upload-card'
    );

    const configCard = document.getElementById(
      'datacheckemails-config-card'
    );

    const resultsSection = document.getElementById(
      'datacheckemails-results-section'
    );

    if (uploadCard) {
      uploadCard.classList.add('hidden');
    }

    if (configCard) {
      configCard.classList.remove('hidden');
    }

    if (resultsSection) {
      resultsSection.classList.add('hidden');
    }
  },

  onError: error => {
    const zone = document.getElementById(
      'datacheckemails-drop-zone'
    );

    if (zone) {
      zone.classList.remove('loading');
    }

    console.error(
      'Data check email upload failed:',
      error
    );

    showDataCheckError(
      'The spreadsheet could not be read. ' +
      'Please check the file and try again.'
    );
  }
});


/* ------------------------------------------------------------
   Deadline formatting
   ------------------------------------------------------------ */

function getDataCheckDeadline() {
  const input = document.getElementById(
    'datacheckemails-deadline'
  );

  const value = input?.value;

  if (!value) {
    return '';
  }

  /*
    Adding T00:00:00 prevents the browser treating the date
    as UTC and potentially shifting it by one day.
  */

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}


/* ------------------------------------------------------------
   Generate emails

   Browser equivalent of:

   data_check_email(df, ranking, year, link, deadline)
   ------------------------------------------------------------ */

function generateDataCheckEmails() {
  hideDataCheckError();

  if (
    !dataCheckEmailData ||
    !Array.isArray(dataCheckEmailData) ||
    dataCheckEmailData.length < 3
  ) {
    showDataCheckError(
      'Please upload a valid data check spreadsheet first.'
    );

    return;
  }

  const ranking = document
    .getElementById('datacheckemails-ranking')
    ?.value
    ?.trim();

  const year = document
    .getElementById('datacheckemails-year')
    ?.value
    ?.trim();

  const link = document
    .getElementById('datacheckemails-link')
    ?.value
    ?.trim();

  const deadline = getDataCheckDeadline();


  /* Validation */

  if (!ranking) {
    showDataCheckError(
      'Please select a ranking.'
    );

    return;
  }

  if (!year) {
    showDataCheckError(
      'Please select a year.'
    );

    return;
  }

  if (!link) {
    showDataCheckError(
      'Please enter the ranking timeline link.'
    );

    return;
  }

  if (!deadline) {
    showDataCheckError(
      'Please select a deadline.'
    );

    return;
  }


  /* ----------------------------------------------------------
     Spreadsheet structure

     Python:

       question_row = df.loc[0]

       check_dict = dict(
           zip(question_row, df.columns)
       )

       df = df.drop(0).copy()

       df.columns = question_row


     In the raw spreadsheet:

       dataCheckEmailData[0]
         = original Excel headers / question text

       dataCheckEmailData[1]
         = first dataframe row / internal field names

       dataCheckEmailData[2:]
         = school data
     ---------------------------------------------------------- */

  const questionText = dataCheckEmailData[0];
  const fieldNames = dataCheckEmailData[1];
  const rows = dataCheckEmailData.slice(2);


  if (
    !Array.isArray(questionText) ||
    !Array.isArray(fieldNames)
  ) {
    showDataCheckError(
      'The spreadsheet does not have the expected structure.'
    );

    return;
  }


  /* Find school_name */

  const schoolIndex = fieldNames.findIndex(
    value =>
      String(value ?? '').trim() === 'school_name'
  );


  if (schoolIndex === -1) {
    showDataCheckError(
      'Could not find "school_name" in the first data row.'
    );

    return;
  }


  /*
    Python:

    check_cols = df.columns[
        df.columns.get_loc('school_name') + 1:
    ].tolist()
  */

  const checkIndexes = [];

  for (
    let i = schoolIndex + 1;
    i < fieldNames.length;
    i++
  ) {
    checkIndexes.push(i);
  }


  /* ----------------------------------------------------------
     Build results
     ---------------------------------------------------------- */

  dataCheckEmailResults = rows
    .filter(row => {
      if (!Array.isArray(row)) {
        return false;
      }

      return row.some(dataCheckValuePresent);
    })

    .map(row => {
      const schoolName = row[schoolIndex];

      /*
        Python:

        [
            (
                f"{row[col]}"
                if str(col).startswith('criteria_grad')
                else check_dict[col]
            )
            for col in check_cols
            if pd.notnull(row[col])
        ]
      */

      const checks = checkIndexes
        .filter(index =>
          dataCheckValuePresent(row[index])
        )

        .map(index => {
          const fieldName = String(
            fieldNames[index] ?? ''
          ).trim();

          /*
            criteria_grad fields use the actual
            value in the school's row.
          */

          if (
            fieldName.startsWith('criteria_grad')
          ) {
            return String(row[index]).trim();
          }

          /*
            All other checks return the original
            Excel column heading / question text.
          */

          return String(
            questionText[index] ?? ''
          ).trim();
        })

        .filter(Boolean);


      /*
        Python:

        "\n\n".join(...)
      */

      const questions = checks.join('\n\n');


      /*
        Same email template as Python.
      */

      const emailBody =
`Dear All,

Thank you for completing the survey for the FT ${ranking} ranking ${year}. We are checking your data.

Please could you confirm your answers to these questions by email by ${deadline}?

${questions}

Please make any changes in your online survey and email us exactly what these changes are, so they do not get missed. Review your whole survey again online, which can be found on the ${ranking} timeline: ${link}.
`;


      return {
        school_name: schoolName,
        email_body: emailBody,
        check_count: checks.length
      };
    })

    /*
      There is no point displaying schools where
      there are no data checks.
    */

    .filter(item =>
      item.check_count > 0
    );


  renderDataCheckEmailResults();
}


/* ------------------------------------------------------------
   Render emails
   ------------------------------------------------------------ */

function renderDataCheckEmailResults() {
  const section = document.getElementById(
    'datacheckemails-results-section'
  );

  const statsRow = document.getElementById(
    'datacheckemails-stats-row'
  );

  const container = document.getElementById(
    'datacheckemails-results'
  );


  if (!section || !statsRow || !container) {
    console.error(
      'Data check email results elements are missing.'
    );

    return;
  }


  if (!dataCheckEmailResults?.length) {
    section.classList.remove('hidden');

    statsRow.innerHTML = `
      <div class="stat-card">
        <div class="stat-num">0</div>
        <div class="stat-label">
          Emails generated
        </div>
      </div>
    `;

    container.innerHTML = `
      <div class="card">
        <p>
          No data check emails were required.
        </p>
      </div>
    `;

    return;
  }


  /* Summary */

  statsRow.innerHTML = `
    <div class="stat-card">
      <div class="stat-num">
        ${dataCheckEmailResults.length}
      </div>

      <div class="stat-label">
        Emails generated
      </div>
    </div>
  `;


  /* Emails */

  container.innerHTML = `
    <div class="card">

      <div class="card-header">
        <span>Data check emails</span>

        <span class="badge">
          ${dataCheckEmailResults.length}
        </span>
      </div>

      <div class="email-list">

        ${dataCheckEmailResults
          .map((item, index) => `
            <div class="email-item">

              <div class="email-item-header">

                <div>
                  <strong>
                    ${escapeDataCheckHtml(
                      item.school_name
                    )}
                  </strong>

                  <div class="muted">
                    ${item.check_count}
                    ${
                      item.check_count === 1
                        ? 'check'
                        : 'checks'
                    }
                  </div>
                </div>

                <button
                  type="button"
                  class="copy-name-btn"
                  data-email-index="${index}">
                  Copy email
                </button>

              </div>

              <pre class="email-body">${escapeDataCheckHtml(
                item.email_body
              )}</pre>

            </div>
          `)
          .join('')}

      </div>

    </div>
  `;


  /* Copy buttons */

  container
    .querySelectorAll('[data-email-index]')
    .forEach(button => {

      button.addEventListener(
        'click',
        async event => {

          event.preventDefault();
          event.stopPropagation();

          const index = Number(
            button.dataset.emailIndex
          );

          const email =
            dataCheckEmailResults[index];

          if (!email) {
            return;
          }

          await copyDataCheckEmail(
            email.email_body,
            button
          );
        }
      );
    });


  section.classList.remove('hidden');


  /* Scroll results into view */

  section.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}


/* ------------------------------------------------------------
   Copy email
   ------------------------------------------------------------ */

async function copyDataCheckEmail(text, button) {
  const originalText = button.textContent;

  try {

    /*
      Preferred clipboard API.
    */

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {

      await navigator.clipboard.writeText(text);

    } else {

      /*
        Fallback for environments where the
        Clipboard API is unavailable.
      */

      const textarea =
        document.createElement('textarea');

      textarea.value = text;

      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';

      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();

      const success =
        document.execCommand('copy');

      textarea.remove();

      if (!success) {
        throw new Error(
          'Copy command failed'
        );
      }
    }


    button.textContent = 'Copied!';
    button.disabled = true;


    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1500);


  } catch (error) {

    console.error(
      'Could not copy data check email:',
      error
    );

    button.textContent = 'Copy failed';


    setTimeout(() => {
      button.textContent = originalText;
    }, 1500);
  }
}