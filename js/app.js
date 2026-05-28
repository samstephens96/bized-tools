/* ================================================================
   app.js — shared utilities
   ================================================================ */

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

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    if (e.dataTransfer.files[0]) {
      if (config.onStart) {
        config.onStart();
      }

      setTimeout(() => {
        readSpreadsheetFile(
          e.dataTransfer.files[0],
          config.onLoaded,
          config.onError
        );
      }, 50);
    }
  });

  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) {
      if (config.onStart) {
        config.onStart();
      }

      setTimeout(() => {
        readSpreadsheetFile(
          e.target.files[0],
          config.onLoaded,
          config.onError
        );
      }, 50);
    }
  });
}

function readSpreadsheetFile(file, onLoaded, onError) {
  const reader = new FileReader();

  reader.onload = e => {
    try {
      const workbook = XLSX.read(e.target.result, { type: 'binary' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rows.length) {
        throw new Error('File appears to be empty.');
      }

      const headers = Object.keys(rows[0]);

      onLoaded({
        file,
        rows,
        headers
      });
    } catch (err) {
      if (onError) {
        onError(err);
      } else {
        alert(err.message);
      }
    }
  };

  reader.readAsBinaryString(file);
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