/* ============================================================
   DATA CHECK EMAILS
   ============================================================ */

let dataCheckEmailData = null;
let dataCheckEmailResults = [];


/* ============================================================
   HELPERS
   ============================================================ */

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


/* ============================================================
   FILE UPLOAD

   This matches setupSpreadsheetUpload() in your app.js.

   app.js returns:

   {
     file,
     rows,
     headers
   }

   rows is an array of objects because app.js uses
   XLSX.utils.sheet_to_json().
   ============================================================ */

setupSpreadsheetUpload({
  dropZoneId: 'datacheckemails-drop-zone',

  /*
    This MUST match your current index.html.

    Your HTML uses:
    id="datacheckemails-file-input"
  */
  fileInputId: 'datacheckemails-file-input',


  onStart: () => {
    hideDataCheckError();

    const zone = document.getElementById(
      'datacheckemails-drop-zone'
    );

    if (zone) {
      zone.classList.add('loading');
    }
  },


  onLoaded: ({ file, rows, headers }) => {
    const zone = document.getElementById(
      'datacheckemails-drop-zone'
    );

    if (zone) {
      zone.classList.remove('loading');
    }


    /*
      Save the structure returned by app.js.

      headers:
        Original Excel column headings / question text

      rows[0]:
        First data row containing internal names such as
        school_name, criteria_grad..., etc.

      rows[1:]:
        Actual school rows
    */

    dataCheckEmailData = {
      headers,
      rows
    };

    dataCheckEmailResults = [];


    /* Show uploaded filename */

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


    /* Move from Step 1 to Step 2 */

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


/* ============================================================
   DEADLINE
   ============================================================ */

function getDataCheckDeadline() {
  const input = document.getElementById(
    'datacheckemails-deadline'
  );

  const value = input?.value;

  if (!value) {
    return '';
  }


  /*
    Using T00:00:00 avoids timezone changes moving the
    selected date backwards or forwards by a day.
  */

  const date = new Date(
    `${value}T00:00:00`
  );


  return date.toLocaleDateString(
    'en-GB',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }
  );
}


/* ============================================================
   GENERATE EMAILS

   Equivalent to:

   def data_check_email(
       df,
       ranking,
       year,
       link,
       deadline
   )
   ============================================================ */

function generateDataCheckEmails() {
  hideDataCheckError();


  /* ----------------------------------------------------------
     Validate uploaded data
     ---------------------------------------------------------- */

  if (
    !dataCheckEmailData ||
    !Array.isArray(dataCheckEmailData.headers) ||
    !Array.isArray(dataCheckEmailData.rows) ||
    dataCheckEmailData.rows.length < 2
  ) {
    showDataCheckError(
      'Please upload a valid data check spreadsheet first.'
    );

    return;
  }


  /* ----------------------------------------------------------
     Get email settings
     ---------------------------------------------------------- */

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


  /* ==========================================================
     RECREATE THE PYTHON DATAFRAME LOGIC

     Python:

       question_row = df.loc[0]

       check_dict = dict(
           zip(question_row, df.columns)
       )

       df = df.drop(0).copy()

       df.columns = question_row
     ========================================================== */


  /*
    Original Excel headings.

    These contain the actual question text.
  */

  const originalHeaders =
    dataCheckEmailData.headers;


  /*
    First data row.

    Because app.js uses sheet_to_json(), this is an object
    whose keys are the original Excel headings.

    Its values contain:

      school_name
      criteria_grad...
      etc.
  */

  const questionRow =
    dataCheckEmailData.rows[0];


  /*
    Equivalent of:

      df.columns = question_row

    Create a lookup from each internal field name to its
    original Excel question heading.

    This is the JavaScript equivalent of:

      check_dict = dict(
          zip(question_row, df.columns)
      )
  */

  const checkDict = {};

  const fieldNames = [];


  originalHeaders.forEach(header => {
    const fieldName = String(
      questionRow[header] ?? ''
    ).trim();

    fieldNames.push(fieldName);

    if (fieldName) {
      checkDict[fieldName] = header;
    }
  });


  /* Find school_name */

  const schoolIndex =
    fieldNames.indexOf('school_name');


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

  const checkFields =
    fieldNames.slice(
      schoolIndex + 1
    );


  /*
    Remove the first data row.

    Python:

      df = df.drop(0).copy()
  */

  const schoolRows =
    dataCheckEmailData.rows.slice(1);


  /* ==========================================================
     BUILD EACH EMAIL
     ========================================================== */

  dataCheckEmailResults = schoolRows
    .map(row => {

      /*
        Convert this object row from original headings
        to the internal field names from questionRow.

        Equivalent to:

          df.columns = question_row
      */

      const mappedRow = {};


      originalHeaders.forEach(
        (header, index) => {

          const fieldName =
            fieldNames[index];

          if (fieldName) {
            mappedRow[fieldName] =
              row[header];
          }
        }
      );


      const schoolName =
        mappedRow.school_name;


      /*
        Python:

        df['checks'] = df.apply(
          lambda row: [
            (
              f"{row[col]}"
              if str(col).startswith(
                'criteria_grad'
              )
              else check_dict[col]
            )
            for col in check_cols
            if pd.notnull(row[col])
          ],
          axis=1
        )
      */

      const checks = checkFields
        .filter(fieldName =>
          dataCheckValuePresent(
            mappedRow[fieldName]
          )
        )

        .map(fieldName => {

          /*
            criteria_grad columns use the actual
            cell value.
          */

          if (
            fieldName.startsWith(
              'criteria_grad'
            )
          ) {
            return String(
              mappedRow[fieldName]
            ).trim();
          }


          /*
            All other fields use the original
            Excel question heading.
          */

          return String(
            checkDict[fieldName] ?? ''
          ).trim();
        })

        .filter(Boolean);


      /*
        Python:

          "\n\n".join(...)
      */

      const questions =
        checks.join('\n\n');


      /*
        Same email template as your Python function.
      */

      const emailBody =
`Dear All,

Thank you for completing the survey for the FT ${ranking} ranking ${year}. We are checking your data.

Please could you confirm your answers to these questions by email by ${deadline}?

${questions}

Please make any changes in your online survey and email us exactly what these changes are, so they do not get missed. Review your whole survey again online, which can be found on the ${ranking} timeline: ${link}.
`;


      const emailSubject =
        `Financial Times ${ranking} ${year} - please - check your data - ${schoolName}`;

    return {
        school_name: schoolName,
        email_subject: emailSubject,
        email_body: emailBody,
        check_count: checks.length
    };


    /*
      Don't show completely blank spreadsheet rows.
    */

    .filter(item =>
      dataCheckValuePresent(
        item.school_name
      )
    )


    /*
      Only show schools that actually have checks.

      If you want to reproduce the Python output literally,
      including schools with zero checks, remove this filter.
    */

    .filter(item =>
      item.check_count > 0
    );


  renderDataCheckEmailResults();
}


/* ============================================================
   RENDER RESULTS
   ============================================================ */

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


  /* No results */

  if (!dataCheckEmailResults.length) {
    statsRow.innerHTML = `
      <div class="stat-card">
        <div class="stat-num">0</div>
        <div class="stat-label">Emails generated</div>
      </div>
    `;

    container.innerHTML = `
      <div class="card">
        <p>No data check emails were required.</p>
      </div>
    `;

    section.classList.remove('hidden');
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


  /*
    Each school gets its own card/bubble.
  */

  container.innerHTML = `
    <div class="data-check-email-list">

      ${dataCheckEmailResults.map((item, index) => `
        <div class="card data-check-email-card">

          <div class="data-check-email-header">

            <div>
              <div class="data-check-email-school">
                ${escapeDataCheckHtml(item.school_name)}
              </div>

              <div class="muted">
                ${item.check_count}
                ${item.check_count === 1 ? 'check' : 'checks'}
              </div>
            </div>

            <div class="data-check-email-actions">

              <button
                type="button"
                class="copy-name-btn"
                data-copy-subject="${index}">
                Copy subject
              </button>

              <button
                type="button"
                class="copy-name-btn"
                data-copy-email="${index}">
                Copy email
              </button>

            </div>

          </div>


          <div class="data-check-email-subject">
            <span class="muted">Subject</span>

            <div>
              ${escapeDataCheckHtml(item.email_subject)}
            </div>
          </div>


          <pre class="email-body">${escapeDataCheckHtml(
            item.email_body
          )}</pre>

        </div>
      `).join('')}

    </div>
  `;


  /* Copy subject */

  container
    .querySelectorAll('[data-copy-subject]')
    .forEach(button => {

      button.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();

        const index = Number(
          button.dataset.copySubject
        );

        const email = dataCheckEmailResults[index];

        if (!email) return;

        await copyDataCheckText(
          email.email_subject,
          button
        );
      });
    });


  /* Copy email */

  container
    .querySelectorAll('[data-copy-email]')
    .forEach(button => {

      button.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();

        const index = Number(
          button.dataset.copyEmail
        );

        const email = dataCheckEmailResults[index];

        if (!email) return;

        await copyDataCheckText(
          email.email_body,
          button
        );
      });
    });


  section.classList.remove('hidden');

  section.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}


  /* ----------------------------------------------------------
     No results
     ---------------------------------------------------------- */

  if (!dataCheckEmailResults.length) {
    statsRow.innerHTML = `
      <div class="stat-card">
        <div class="stat-num">
          0
        </div>

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


    section.classList.remove(
      'hidden'
    );

    return;
  }


  /* ----------------------------------------------------------
     Stats
     ---------------------------------------------------------- */

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


  /* ----------------------------------------------------------
     Email cards
     ---------------------------------------------------------- */

  container.innerHTML = `
    <div class="card">

      <div class="card-header">

        <span>
          Data check emails
        </span>

        <span class="badge">
          ${dataCheckEmailResults.length}
        </span>

      </div>


      <div class="email-list">

        ${dataCheckEmailResults
          .map(
            (item, index) => `
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
                    data-email-index="${index}"
                  >
                    Copy email
                  </button>

                </div>


                <pre class="email-body">${escapeDataCheckHtml(
                  item.email_body
                )}</pre>

              </div>
            `
          )
          .join('')}

      </div>

    </div>
  `;


  /* ----------------------------------------------------------
     Copy buttons
     ---------------------------------------------------------- */

  container
    .querySelectorAll(
      '[data-email-index]'
    )
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
            dataCheckEmailResults[
              index
            ];


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


  section.classList.remove(
    'hidden'
  );


  section.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}


/* ============================================================
   COPY EMAIL
   ============================================================ */

async function copyDataCheckText(
  text,
  button
) {
  const originalText =
    button.textContent;


  try {

    /*
      Normal modern-browser clipboard API.
    */

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {

      await navigator.clipboard.writeText(
        text
      );

    } else {

      /*
        Fallback for browsers/environments where
        navigator.clipboard isn't available.
      */

      const textarea =
        document.createElement(
          'textarea'
        );


      textarea.value = text;

      textarea.style.position =
        'fixed';

      textarea.style.left =
        '-9999px';

      textarea.style.top =
        '-9999px';


      document.body.appendChild(
        textarea
      );


      textarea.focus();
      textarea.select();


      const success =
        document.execCommand(
          'copy'
        );


      textarea.remove();


      if (!success) {
        throw new Error(
          'Copy command failed'
        );
      }
    }


    button.textContent =
      'Copied!';

    button.disabled = true;


    setTimeout(() => {
      button.textContent =
        originalText;

      button.disabled = false;
    }, 1500);


  } catch (error) {

    console.error(
      'Could not copy data check email:',
      error
    );


    button.textContent =
      'Copy failed';


    setTimeout(() => {
      button.textContent =
        originalText;
    }, 1500);
  }
}