(function () {
  'use strict';
  var exam = JSON.parse(document.getElementById('exam-data').textContent);
  var S = JSON.parse(document.getElementById('strings-data').textContent);
  window.__EXAM__ = exam;
  window.__STRINGS__ = S;
  var app = document.getElementById('app');
  app.setAttribute('data-exam-id', exam.id);

  var state = {
    phase: 'item', mode: 'exam', index: 0, fromReview: false,
    answers: {}, flags: {}, comments: {}, checked: {},
    remainingSec: exam.durationMinutes * 60, timerHidden: false, counterHidden: false,
  };
  var frozen = false;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function label(key) { return S[key] || key; }
  // "다음 (N)" -> "다음 (<span class=abe-accesskey>N</span>)"
  function keyLabel(text) {
    var m = /^(.*\()(.)(\))$/.exec(text);
    return m ? esc(m[1]) + '<span class="abe-accesskey">' + esc(m[2]) + '</span>' + esc(m[3]) : esc(text);
  }
  function mmss(sec) {
    sec = Math.max(0, sec);
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  var HELP = label('UserInterface.Buttons.Button.Next.accessibleDescription');

  function button(id, key, accesskey, extra) {
    var t = label('UserInterface.Buttons.Button.' + key + '.label');
    return '<button id="' + id + '" class="rc-fonts-Small' + ((extra && extra.cls) || '') + '" data-accesskey="' + accesskey +
      '" accesskey="' + accesskey + '">' + keyLabel(t) + '</button>';
  }

  function titleBar(item) {
    var left = state.remainingSec, total = exam.items.length;
    var timerText = label('UserInterface.Buttons.Button.TimeRemainingSection.label').replace('${timeRemaining}', mmss(left));
    var min = Math.floor(left / 60), sec = left % 60;
    var timerName = label('Timing.Property.HideTimer.value') + ' 남은 시간 ' + min + ' 분, ' + sec + ' 초';
    var counter = '문제 ' + (state.index + 1) + ' / ' + total;
    var timerHtml = state.mode === 'study' ? '' :
      '<div id="abe-timer" role="timer"><button id="abe-TimeRemainingSectionButton" role="button">' +
      '<span id="abe-timerPlaceholder"></span><span id="accessibleTimerText" class="sr-only">' + esc(timerName) + '</span>' +
      '<div id="abe-timerContents" class="rc-fonts-Message' + (state.timerHidden ? ' off' : '') + '" aria-hidden="true">' +
      '<span id="abe-timerLabel">' + esc(timerText.replace(mmss(left), '')) + '</span><span id="timeRemaining">' + mmss(left) + '</span></div></button></div>';
    return '<div id="abe-titlebar" class="Primary" role="region" aria-labelledby="Title_bar">' +
      '<span id="Title_bar" style="display:none">Title bar</span>' +
      '<div id="abe-application-logo"><span class="abe-ApplicationLogoImage"></span></div>' +
      '<div id="abe-titlebar-title" class="rc-fonts-Large" tabindex="-1"><span id="abe-assessment-title">' + esc(exam.title) +
      '</span>\n - <span id="abe-assessment-candidate">' + esc(exam.candidate) + '</span></div>' +
      '<div id="abe-titlebar-info">' + timerHtml +
      '<div id="abe-itemCounter" role="heading" aria-level="1"><button id="abe-ItemOrdinalKnownButton" role="button" aria-label="' +
      esc(label('UserInterface.ContextHelp.Property.ItemOrdinalHide.value') + ' ' + counter) + '"><div class="abe-hidden-shim"></div>' +
      '<div id="abe-itemCounterWrapper" class="' + (state.counterHidden ? 'off' : '') + '" aria-hidden="true"><span id="abe-ItemOrdinalKnown" class="rc-fonts-Message">문제 <span id="itemOrdinal">' +
      (state.index + 1) + '</span> / <span id="itemCardinal">' + total + '</span></span></div></button></div></div></div>';
  }

  function colorSchemes() {
    var names = ['Default', 'YellowonBlack', 'LightYellowonBlack', 'WhiteonBlack', 'BlackonYellow', 'BlueonYellow',
      'BlackonLightYellow', 'BlackonSalmon', 'YellowonBlue', 'WhiteonBlue', 'BlackonWhite', 'BlueonWhite'];
    var text = label('UserInterface.ColorSchemes.Property.Default.value');
    return '<div class="abe-icon-left abe-colorSchemeDropDown"><span class="ui-selectmenu abe-colorSchemeDropdownButton" id="colorSchemeDropDown">' +
      '<span id="dropdown-colorSchemes" class="abe-drop_down"><span class="ui-selectmenu-button ui-widget ui-button ui-state-default ui-corner-all" tabindex="0" id="colorSchemes-button" role="combobox" aria-expanded="false" aria-haspopup="true" aria-label="색 구성표에 대해 선택된 기본 색 구성표">' +
      '<span class="ui-icon ui-icon-triangle-1-s"></span><span class="ui-selectmenu-text rc-fonts-Small">' + esc(text) + '</span></span></span></span></div>';
  }

  function toolBar() {
    var flagged = !!state.flags[exam.items[state.index].id];
    return '<div id="abe-toolbar" class="Secondary" role="region" aria-labelledby="Tool_bar" style="display:table;height:30px">' +
      '<span id="Tool_bar" style="display:none">Tool bar</span>' +
      '<div id="abe-toolbar-tools"><div class="abe-icon-left" style="padding-left:5px">' + button('abe-CommentButton', 'Comment', 'M') + '</div></div>' +
      '<div id="abe-toolbar-flags"><div class="abe-icon-left" style="padding-left:5px">' +
      button('abe-FlagForReviewItemButton', 'FlagForReviewItem', 'F', { cls: flagged ? ' abe-FlagForReviewItemButtonSelected' : ' abe-FlagForReviewItemButtonUnselected' }) +
      '</div>' + colorSchemes() + '</div></div>';
  }

  function navBar() {
    var prev = state.index > 0 ?
      '<div class="abe-inline-button-right abe-icon-left" style="padding-left:0"><button id="abe-PreviousButton" class="rc-fonts-Normal" data-accesskey="P" accesskey="P">' +
      keyLabel(label('UserInterface.Buttons.Button.Previous.label')) + '</button></div>' : '';
    var next = '<div class="abe-inline-button-right abe-icon-right"><button id="abe-NextButton" class="rc-fonts-Normal" data-accesskey="N" accesskey="N">' +
      keyLabel(label('UserInterface.Buttons.Button.Next.label')) + '</button></div>';
    return '<div id="abe-navigationbar" class="Primary" role="navigation"><div id="abe-navigation-help-finish"></div>' +
      '<div id="abe-navigation-jump">' + prev + next + '</div></div>';
  }

  function textBlock(text) {
    return String(text).split(/\n\n/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
  }

  function optionRow(item, opt, checked, multi) {
    var id = esc(item.id) + '.R.' + esc(opt.id);
    return '<div class="abe-opt">' +
      '<div class="abe-opt-input"><label class="abe-parentLabel"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="response-' + esc(item.id) +
      '" id="' + id + '" value="' + esc(opt.id) + '" aria-label="' + esc(opt.id + '. ' + opt.ko) + '"' + (checked ? ' checked' : '') + '></label></div>' +
      '<label class="abe-opt-letter" for="' + id + '" aria-hidden="true"><p>' + esc(opt.id) + '.</p><p><span class="tab"></span></p></label>' +
      '<label class="abe-opt-text" for="' + id + '" aria-hidden="true"><div class="abe-mat-html">' + esc(opt.ko) + '</div></label></div>';
  }

  function itemBody(item) {
    var sel = state.answers[item.id] || [];
    var multi = item.type === 'multiple';
    var html = '<div class="abe-english-row"><button id="exhibit1" class="abe-ExhibitButton rc-fonts-Small Secondary abe-NoDefaultImage" style="color:#fff !important">' +
      '<div class="abe-ImageLabelContainer"><div class="abe-DefaultLabelContainer">English</div></div></button></div>';
    html += '<div class="abe-stem abe-mat-html">' + textBlock(item.stem.ko) + '</div>';
    if (item.options) html += item.options.map(function (o) { return optionRow(item, o, sel.indexOf(o.id) >= 0, multi); }).join('');
    return html;
  }

  function render() {
    var item = exam.items[state.index];
    app.innerHTML = titleBar(item) + toolBar() +
      '<div id="abe-contentPane" class="Content rc-fonts-ItemText" dir="ltr" tabindex="-1" role="main"><div id="abe-readMe" class="contentPaneLanguageWrapper dynamicContent heightRoot" dir="ltr" tabindex="0">' +
      '<div class="abe-content-root">' + itemBody(item) + '</div></div></div>' + navBar();
  }

  function go(i) {
    state.index = Math.max(0, Math.min(exam.items.length - 1, i));
    render();
  }

  function tick() {
    if (frozen || state.mode === 'study' || state.phase === 'start' || state.phase === 'result') return;
    state.remainingSec = Math.max(0, state.remainingSec - 1);
    var el = document.getElementById('timeRemaining');
    if (el) el.textContent = mmss(state.remainingSec);
  }
  setInterval(tick, 1000);

  app.addEventListener('click', function (e) {
    var t = e.target.closest('button, input');
    if (!t) return;
    if (t.id === 'abe-NextButton') go(state.index + 1);
    else if (t.id === 'abe-PreviousButton') go(state.index - 1);
    else if (t.id === 'abe-TimeRemainingSectionButton') { state.timerHidden = !state.timerHidden; render(); }
    else if (t.id === 'abe-ItemOrdinalKnownButton') { state.counterHidden = !state.counterHidden; render(); }
    else if (t.id === 'abe-FlagForReviewItemButton') {
      var fid = exam.items[state.index].id;
      if (state.flags[fid]) delete state.flags[fid]; else state.flags[fid] = true;
      render();
    }
  });

  app.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'INPUT' || !/^response-/.test(t.name)) return;
    var qid = t.name.slice('response-'.length);
    var cur = state.answers[qid] || [];
    if (t.type === 'radio') cur = [t.value];
    else cur = t.checked ? cur.concat(t.value) : cur.filter(function (v) { return v !== t.value; });
    state.answers[qid] = cur;
  });

  render();

  if (/[?&]test=1/.test(location.search)) {
    window.__exam = {
      load: function (s) {
        for (var k in s) state[k] = s[k];
        render();
      },
      setRemaining: function (sec) { frozen = true; state.remainingSec = sec; render(); },
      state: state,
    };
  }
})();
