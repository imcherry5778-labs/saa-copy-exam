(function () {
  'use strict';
  var exam = JSON.parse(document.getElementById('exam-data').textContent);
  var strings = JSON.parse(document.getElementById('strings-data').textContent);
  window.__EXAM__ = exam;
  window.__STRINGS__ = strings;
  document.getElementById('app').setAttribute('data-exam-id', exam.id);
})();
