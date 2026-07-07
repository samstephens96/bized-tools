/* ================================================================
   app.js — shared utilities
   ================================================================ */

window.addEventListener('dragover', event => {
  event.preventDefault();
});

window.addEventListener('drop', event => {
  event.preventDefault();
});

function switchTool(name) {
  document.querySelectorAll('.tool-tab').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });

  document.querySelectorAll('.tool-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  const tab = document.getElementById('tab-' + name);
  const panel = document.getElementById('panel-' + name);

  if (tab) {
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
  }

  if (panel) {
    panel.classList.add('active');
  }

  // Remember the selected tab
  localStorage.setItem('selectedToolTab', name);
  history.replaceState(null, '', '#' + name);
  const titles = {
    home: 'Home',
    checker: 'Alumni list checker',
    facultychecker: 'Faculty list checker',
    responserates: 'Response rates'
  };

  document.title = `${titles[name]} | BizEd Tools`;
}

function showBanner(elementId, message, type = 'danger') {
  const el = document.getElementById(elementId);

  if (!el) return;

  el.querySelector('span').textContent = message;
  el.className = `banner banner-${type}`;
  el.classList.remove('hidden');
}

function hideBanner(elementId) {
  const el = document.getElementById(elementId);

  if (el) {
    el.classList.add('hidden');
  }
}

function setupSpreadsheetUpload(config) {
  const dropZone = document.getElementById(config.dropZoneId);
  const fileInput = document.getElementById(config.fileInputId);

  if (!dropZone || !fileInput) {
    console.warn('Upload setup failed:', config.dropZoneId, config.fileInputId);
    return;
  }

  function loadFile(file) {
    if (!file) return;

    if (config.onStart) {
      config.onStart();
    }

    setTimeout(() => {
      readSpreadsheetFile(
        file,
        config.onLoaded,
        config.onError
      );
    }, 50);
  }

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, event => {
      event.preventDefault();
      event.stopPropagation();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'dragend'].forEach(eventName => {
    dropZone.addEventListener(eventName, event => {
      event.preventDefault();
      event.stopPropagation();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', event => {
    event.preventDefault();
    event.stopPropagation();
    dropZone.classList.remove('drag-over');

    const file = event.dataTransfer && event.dataTransfer.files
      ? event.dataTransfer.files[0]
      : null;

    loadFile(file);
  });

  fileInput.addEventListener('change', event => {
    const file = event.target.files && event.target.files[0]
      ? event.target.files[0]
      : null;

    loadFile(file);
  });
}

function readSpreadsheetFile(file, onLoaded, onError) {
  const reader = new FileReader();

  reader.onload = event => {
    setTimeout(() => {
      try {
        const workbook = XLSX.read(event.target.result, {
          type: 'array',
          cellDates: false,
          cellNF: false,
          cellStyles: false
        });

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: ''
        });

        if (!rows.length) {
          throw new Error('File appears to be empty.');
        }

        onLoaded({
          file,
          rows,
          headers: Object.keys(rows[0])
        });

      } catch (err) {
        if (onError) {
          onError(err);
        } else {
          alert(err.message);
        }
      }
    }, 0);
  };

  reader.onerror = () => {
    if (onError) {
      onError(new Error('Could not read the file.'));
    }
  };

  reader.readAsArrayBuffer(file);
}

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

document.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.replace('#', '');

  if (hash && document.getElementById('tab-' + hash)) {
    switchTool(hash);
    return;
  }

  const savedTab = localStorage.getItem('selectedToolTab');

  if (savedTab && document.getElementById('tab-' + savedTab)) {
    switchTool(savedTab);
  }
});