/* ================================================================
   datacheckemails.js — Data check emails tool
   ================================================================ */

const dataCheckEmailsRankings = [
  'Global MBA',
  'Executive MBA',
  'Masters in Management',
  'Masters in Finance',
  'Online MBA',
  'Executive Education',
  'European Business Schools'
];

const dataCheckEmailsYears = [2025, 2026, 2027, 2028, 2029, 2030];

function initDataCheckEmails() {
  const ranking = document.getElementById('datacheckemails-ranking');
  const year = document.getElementById('datacheckemails-year');

  if (!ranking || !year) return;

  ranking.innerHTML = [
    '<option value="">Select ranking</option>',
    ...dataCheckEmailsRankings.map(value => `<option value="${value}">${value}</option>`)
  ].join('');

  year.innerHTML = [
    '<option value="">Select year</option>',
    ...dataCheckEmailsYears.map(value => `<option value="${value}"${value === 2026 ? ' selected' : ''}>${value}</option>`)
  ].join('');
}

document.addEventListener('DOMContentLoaded', initDataCheckEmails);
