(function () {
  'use strict';
  var exam = JSON.parse(document.getElementById('exam-data').textContent);
  var S = JSON.parse(document.getElementById('strings-data').textContent);
  window.__EXAM__ = exam;
  window.__STRINGS__ = S;
  var app = document.getElementById('app');
  app.setAttribute('data-exam-id', exam.id);

  var STORAGE_KEY = 'saa-mock:' + exam.id;
  var state = {
    phase: 'start', mode: 'exam', index: 0, fromReview: false, reviewTab: 'All', reviewList: null,
    answers: {}, flags: {}, comments: {}, checked: {},
    remainingSec: exam.durationMinutes * 60, startedAt: null,
    timerHidden: false, counterHidden: false, english: false, commentOpen: false, schemeOpen: false, instructionsOpen: false, endReviewStep: 0,
    resumeSaved: null,
  };
  var frozen = false;
  var tickCount = 0;

  function saveState() {
    if (state.phase === 'start') return;
    if (!state.startedAt) state.startedAt = Date.now();
    tickCount = 0;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode: state.mode,
        index: state.index,
        answers: state.answers,
        flags: state.flags,
        comments: state.comments,
        checked: state.checked,
        remainingSec: state.remainingSec,
        startedAt: state.startedAt,
        phase: state.phase,
      }));
    } catch (e) {}
  }

  function clearSavedState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function readSavedState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || parsed.phase === 'start') return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function applySavedState(saved) {
    state.mode = saved.mode || 'exam';
    state.index = typeof saved.index === 'number' ? saved.index : 0;
    state.answers = saved.answers || {};
    state.flags = saved.flags || {};
    state.comments = saved.comments || {};
    state.checked = saved.checked || {};
    state.remainingSec = typeof saved.remainingSec === 'number' ? saved.remainingSec : exam.durationMinutes * 60;
    state.startedAt = saved.startedAt || Date.now();
    state.phase = saved.phase || 'item';
    state.fromReview = false;
    state.reviewList = null;
    state.reviewTab = 'All';
    state.english = false;
    state.commentOpen = false;
    state.instructionsOpen = false;
    state.endReviewStep = 0;
  }

  function resetState() {
    state.phase = 'start';
    state.mode = 'exam';
    state.index = 0;
    state.fromReview = false;
    state.reviewTab = 'All';
    state.reviewList = null;
    state.answers = {};
    state.flags = {};
    state.comments = {};
    state.checked = {};
    state.remainingSec = exam.durationMinutes * 60;
    state.startedAt = null;
    state.english = false;
    state.commentOpen = false;
    state.instructionsOpen = false;
    state.endReviewStep = 0;
  }

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
    var timerHtml = (state.mode === 'study' || state.phase === 'start' || state.phase === 'result') ? '' :
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
      '<div id="abe-itemCounter" role="heading" aria-level="1"' + (state.phase !== 'item' ? ' style="display:none"' : '') + '><button id="abe-ItemOrdinalKnownButton" role="button" aria-label="' +
      esc(label('UserInterface.ContextHelp.Property.ItemOrdinalHide.value') + ' ' + counter) + '"><div class="abe-hidden-shim"></div>' +
      '<div id="abe-itemCounterWrapper" class="' + (state.counterHidden ? 'off' : '') + '" aria-hidden="true"><span id="abe-ItemOrdinalKnown" class="rc-fonts-Message">문제 <span id="itemOrdinal">' +
      (state.index + 1) + '</span> / <span id="itemCardinal">' + total + '</span></span></div></button></div></div></div>';
  }

  function colorSchemes() {
    var names = ['Default', 'YellowonBlack', 'LightYellowonBlack', 'WhiteonBlack', 'BlackonYellow', 'BlueonYellow',
      'BlackonLightYellow', 'BlackonSalmon', 'YellowonBlue', 'WhiteonBlue', 'BlackonWhite', 'BlueonWhite'];
    var text = label('UserInterface.ColorSchemes.Property.Default.value');
    var menu = state.schemeOpen ? '<ul id="colorSchemes-menu" class="ui-menu abe-colorSchemeMenu" role="listbox">' + names.map(function (n, i) {
      return '<li class="ui-menu-item' + (i === 0 ? ' ui-state-active' : '') + '" role="option" data-scheme="' + n + '"><div>' +
        esc(label('UserInterface.ColorSchemes.Property.' + n + '.value')) + '</div></li>';
    }).join('') + '</ul>' : '';
    return '<div class="abe-icon-left abe-colorSchemeDropDown"><span class="ui-selectmenu abe-colorSchemeDropdownButton" id="colorSchemeDropDown">' +
      '<span id="dropdown-colorSchemes" class="abe-drop_down"><span class="ui-selectmenu-button ui-widget ui-button ui-state-default ui-corner-all" tabindex="0" id="colorSchemes-button" role="combobox" aria-expanded="' + !!state.schemeOpen + '" aria-haspopup="true" aria-label="색 구성표에 대해 선택된 기본 색 구성표">' +
      '<span class="ui-icon ui-icon-triangle-1-s"></span><span class="ui-selectmenu-text rc-fonts-Small">' + esc(text) + '</span></span></span></span>' + menu + '</div>';
  }

  function toolBar() {
    if (state.phase === 'start' || state.phase === 'result') {
      return '<div id="abe-toolbar" class="Secondary" role="region" aria-labelledby="Tool_bar" style="display:table;height:30px">' +
        '<span id="Tool_bar" style="display:none">Tool bar</span>' +
        '<div id="abe-toolbar-tools"></div>' +
        '<div id="abe-toolbar-flags">' + colorSchemes() + '</div></div>';
    }
    if (state.phase === 'review') {
      return '<div id="abe-toolbar" class="Secondary" role="region" aria-labelledby="Tool_bar" style="display:table;height:30px">' +
        '<span id="Tool_bar" style="display:none">Tool bar</span>' +
        '<div id="abe-toolbar-tools"><div class="abe-icon-left" style="padding-left:5px">' +
        '<button id="abe-ReviewInstructionsButton" class="rc-fonts-Normal" data-accesskey="R" accesskey="R">' +
        keyLabel(label('UserInterface.Buttons.Button.ReviewInstructions.label')) + '</button></div></div>' +
        '<div id="abe-toolbar-flags">' + colorSchemes() + '</div></div>';
    }
    var flagged = !!state.flags[exam.items[state.index].id];
    return '<div id="abe-toolbar" class="Secondary" role="region" aria-labelledby="Tool_bar" style="display:table;height:30px">' +
      '<span id="Tool_bar" style="display:none">Tool bar</span>' +
      '<div id="abe-toolbar-tools"><div class="abe-icon-left" style="padding-left:5px">' + button('abe-CommentButton', 'Comment', 'M') + '</div></div>' +
      '<div id="abe-toolbar-flags"><div class="abe-icon-left" style="padding-left:5px">' +
      button('abe-FlagForReviewItemButton', 'FlagForReviewItem', 'F', { cls: flagged ? ' abe-FlagForReviewItemButtonSelected' : ' abe-FlagForReviewItemButtonUnselected' }) +
      '</div>' + colorSchemes() + '</div></div>';
  }

  function navBar() {
    if (state.phase === 'start') {
      var startNext = '<div class="abe-inline-button-right abe-icon-right"><button id="abe-NextButton" class="rc-fonts-Normal" data-accesskey="N" accesskey="N">' +
        keyLabel(label('UserInterface.Buttons.Button.Next.label')) + '</button></div>';
      return '<div id="abe-navigationbar" class="Primary" role="navigation"><div id="abe-navigation-help-finish"></div>' +
        '<div id="abe-navigation-jump">' + startNext + '</div></div>';
    }
    if (state.phase === 'review') {
      return '<div id="abe-navigationbar" class="Primary" role="navigation"><div id="abe-navigation-help-finish">' +
        '<div class="abe-inline-button-left abe-icon-left" style="padding-left:5px"><button id="abe-EndReviewButton" class="rc-fonts-Normal" data-accesskey="E" accesskey="E">' +
        keyLabel(label('UserInterface.Buttons.Button.EndReview.label')) + '</button></div></div>' +
        '<div id="abe-navigation-jump"></div></div>';
    }
    if (state.phase === 'result') {
      return '<div id="abe-navigationbar" class="Primary" role="navigation"><div id="abe-navigation-help-finish">' +
        '<div class="abe-inline-button-left abe-icon-left" style="padding-left:5px"><button id="abe-AnswerReviewButton" class="rc-fonts-Normal" data-accesskey="I" accesskey="I">' +
        keyLabel('오답 해설 (I)') + '</button></div></div>' +
        '<div id="abe-navigation-jump" class="abe-has-prev">' +
        '<div class="abe-inline-button-right" style="padding-left:5px"><button id="abe-RetryButton" class="rc-fonts-Normal">다시 풀기</button></div>' +
        '<div class="abe-inline-button-right" style="padding-left:5px"><button id="abe-HomeButton" class="rc-fonts-Normal">처음으로</button></div>' +
        '</div></div>';
    }
    var rev = state.fromReview ?
      '<div class="abe-inline-button-left abe-icon-left" style="padding-left:5px"><button id="abe-ReviewScreenButton" class="rc-fonts-Normal" data-accesskey="S" accesskey="S">' +
      keyLabel(label('UserInterface.Buttons.Button.ReviewScreen.label')) + '</button></div>' : '';
    var hasPrev = state.reviewList ? state.reviewList.indexOf(state.index) > 0 : state.index > 0;
    var prev = hasPrev ?
      '<div class="abe-inline-button-right abe-icon-left" style="padding-left:5px"><button id="abe-PreviousButton" class="rc-fonts-Normal" data-accesskey="P" accesskey="P">' +
      keyLabel(label('UserInterface.Buttons.Button.Previous.label')) + '</button></div>' : '';
    var next = '<div class="abe-inline-button-right abe-icon-right"><button id="abe-NextButton" class="rc-fonts-Normal" data-accesskey="N" accesskey="N">' +
      keyLabel(label('UserInterface.Buttons.Button.Next.label')) + '</button></div>';
    return '<div id="abe-navigationbar" class="Primary" role="navigation"><div id="abe-navigation-help-finish">' + rev + '</div>' +
      '<div id="abe-navigation-jump"' + (prev ? ' class="abe-has-prev"' : '') + '>' + prev + next + '</div></div>';
  }

  function textBlock(text) {
    return String(text).split(/\n\n/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
  }

  function optionRow(item, opt, checked, multi) {
    var id = esc(item.id) + '.R.' + esc(opt.id);
    return '<div class="abe-opt">' +
      '<div class="abe-opt-input"><label class="abe-parentLabel"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="response-' + esc(item.id) +
      '" id="' + id + '" value="' + esc(opt.id) + '" aria-label="' + esc(opt.id + '. ' + opt.ko) + '"' + (checked ? ' checked' : '') + '></label></div>' +
      '<label class="abe-opt-letter' + (opt.compact ? ' abe-compact' : '') + '" for="' + id + '" aria-hidden="true"><p>' + esc(opt.id) + '.</p>' + (opt.compact ? '' : '<p><span class="tab"></span></p>') + '</label>' +
      '<label class="abe-opt-text" for="' + id + '" aria-hidden="true"><div class="abe-mat-html">' + esc(opt.ko) + '</div></label></div>';
  }

  // jQuery UI selectmenu 모양의 드롭다운. 실제 <select>를 투명하게 덮어 입력을 받는다.
  function slotSelect(item, i, value, name) {
    var ph = label('UserInterface.Property.ComboBoxEmptyValue.value');
    var cur = null;
    for (var k = 0; k < item.choices.length; k++) if (item.choices[k].id === value) cur = item.choices[k];
    var ghost = [ph].concat(item.choices.map(function (c) { return c.ko; })).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    var opts = '<option value="">' + esc(ph) + '</option>' + item.choices.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === value ? ' selected' : '') + '>' + esc(c.ko) + '</option>';
    }).join('');
    return '<span class="ui-selectmenu"><span class="ui-selectmenu-button" data-slot="' + i + '">' +
      '<span class="ui-icon ui-icon-triangle-1-s"></span>' +
      '<span class="abe-ghost" aria-hidden="true">' + ghost + '</span>' +
      '<span class="ui-selectmenu-text">' + esc(cur ? cur.ko : ph) + '</span>' +
      '<select class="abe-drop_down" data-slot="' + i + '" aria-label="' + esc(name) + '">' + opts + '</select></span></span>';
  }

  // 원본 구조: 행마다 <p><span batang 12pt>…</span></p>, 행 사이에 &nbsp; 빈 행.
  function slotP(inner) {
    return '<p' + (inner === '&nbsp;' ? '' : ' class="abe-slot"') + '><span style="font-family:Batang,&quot;Noto Sans CJK KR&quot;,sans-serif;font-size:12pt">' + inner + '</span></p>';
  }

  function orderingBody(item) {
    var sel = state.answers[item.id] || [];
    var html = '<div class="abe-ordering">';
    html += '<ul class="abe-choice-list">' + item.choices.map(function (c) { return '<li> ' + esc(c.ko) + '</li>'; }).join('') + '</ul>';
    html += slotP('&nbsp;');
    item.slots.forEach(function (sl, i) {
      var lab = sl.label ? esc(sl.label.ko) : '';
      var dd = slotSelect(item, i, sel[i] || null, sl.label ? sl.label.ko : '슬롯 ' + (i + 1));
      html += slotP(sl.side === 'left' ? (lab ? lab + '&nbsp;&nbsp;&nbsp;&nbsp;' : '') + dd : dd + (lab ? '&nbsp;' + lab : ''));
      if (i < item.slots.length - 1) html += slotP('&nbsp;');
    });
    return html + '</div>';
  }

  // matching: 범주 목록 + prompt별 드롭다운(라벨은 왼쪽). 답은 {promptId: choiceId}.
  function matchingBody(item) {
    var sel = state.answers[item.id] || {};
    var html = '<div class="abe-ordering">';
    html += '<ul class="abe-choice-list">' + item.choices.map(function (c) { return '<li> ' + esc(c.ko) + '</li>'; }).join('') + '</ul>';
    item.prompts.forEach(function (pr, i) {
      html += slotP(esc(pr.ko) + '&nbsp;&nbsp;&nbsp;' + slotSelect(item, i, sel[pr.id] || null, pr.ko));
      if (i < item.prompts.length - 1) html += slotP('&nbsp;');
    });
    return html + '</div>';
  }

  function itemBody(item) {
    var sel = state.answers[item.id] || [];
    var multi = item.type === 'multiple';
    var html = '<div class="abe-english-row"><button id="exhibit1" class="abe-ExhibitButton rc-fonts-Small Secondary abe-NoDefaultImage" style="color:#fff !important">' +
      '<div class="abe-ImageLabelContainer"><div class="abe-DefaultLabelContainer">English</div></div></button></div>';
    var head = '';
    if (item.caseStudy) {
      var group = exam.items.filter(function (x) { return x.caseStudy === item.caseStudy; });
      head = '<div class="abe-casestudy abe-mat-html"><h1><p style="font-size:16px"><b>사례 연구 - ' + group.length + ' 문항</b></p></h1>' +
        textBlock(exam.caseStudies[item.caseStudy].scenario.ko) + '</div>' +
        '<h2><p style="font-size:16px"><b>문항 (' + (group.indexOf(item) + 1) + '/' + group.length + ')</b></p></h2>';
    }
    html += '<div class="abe-stem abe-mat-html' + (item.type === 'ordering' || item.type === 'matching' ? ' abe-stem-ordering' : '') + '">' + head + textBlock(item.stem.ko) + '</div>';
    if (item.type === 'ordering') html += orderingBody(item);
    if (item.type === 'matching') html += matchingBody(item);
    if (item.options) html += item.options.map(function (o) { return optionRow(item, o, sel.indexOf(o.id) >= 0, multi); }).join('');
    return html;
  }

  // English 팝업: 영어 stem과 보기 "A. ..." (jQuery UI dialog 마크업을 따른다)
  function englishDialog(item) {
    var opts = (item.options || []).map(function (o) {
      return '<div class="abe-eng-opt"><p lang="en">' + esc(o.id + '. ' + o.en) + '</p></div>';
    }).join('');
    return '<div tabindex="-1" role="dialog" class="ui-dialog ui-corner-all ui-widget ui-widget-content ui-front tabbed-dialog-all rc-fonts-Message Primary abe-english-dialog" aria-labelledby="abe-eng-title">' +
      '<div class="ui-dialog-titlebar ui-corner-all ui-widget-header ui-helper-clearfix"><span id="abe-eng-title" class="ui-dialog-title rc-fonts-Message"><span class="abe-ExhibitImage"></span>' +
      '<span class="abe-ui-exam-dialog-title rc-fonts-Normal">English</span></span>' +
      '<button type="button" id="abe-eng-close" class="ui-button ui-corner-all ui-widget ui-button-icon-only ui-dialog-titlebar-close" title="Close"><span class="ui-button-icon ui-icon ui-icon-closethick"></span><span class="ui-button-icon-space"> </span>Close</button></div>' +
      '<div class="abe-popup-window-tabbed-dialog ui-dialog-content Content rc-fonts-ItemText"><div class="abe-eng-body abe-mat-html">' +
      String(item.stem.en).split(/\n\n/).map(function (p) { return '<p lang="en">' + esc(p) + '</p>'; }).join('') + opts + '</div></div></div>';
  }

  // 설명 대화상자: TinyMCE 대신 textarea를 같은 모양의 상자에 넣는다
  function commentDialog(item) {
    var save = label('UserInterface.Buttons.Button.Save.label'), cancel = label('UserInterface.Buttons.Button.Cancel.label');
    var title = label('UserInterface.Buttons.Button.Comment.label');
    return '<div tabindex="-1" role="dialog" class="ui-dialog ui-corner-all ui-widget ui-widget-content ui-front rc-fonts-Message Primary ui-dialog-buttons abe-comment-dialog" aria-labelledby="abe-cmt-title">' +
      '<div class="ui-dialog-titlebar ui-corner-all ui-widget-header ui-helper-clearfix"><span id="abe-cmt-title" class="ui-dialog-title rc-fonts-Message"><span class="abe-CommentImage"></span>' +
      '<span class="abe-ui-exam-dialog-title rc-fonts-Message">' + esc(title.replace(/\s*\(.\)$/, '')) + '</span></span></div>' +
      '<div id="abe-commentWindow" class="ui-dialog-content ui-widget-content Content rc-fonts-TextEntry"><textarea id="abe-commentTxt" class="abe-comment-text rc-fonts-TextEntry" aria-label="' +
      esc(title) + '">' + esc(state.comments[item.id] || '') + '</textarea></div>' +
      '<div class="ui-dialog-buttonpane ui-widget-content ui-helper-clearfix"><div class="ui-dialog-buttonset">' +
      '<button type="button" id="SAVE" accesskey="S" aria-label="' + esc(save) + '" class="ui-button ui-corner-all ui-widget rc-fonts-Message">' + keyLabel(save) + '</button>' +
      '<button type="button" id="CANCEL" accesskey="C" aria-label="' + esc(cancel) + '" class="ui-button ui-corner-all ui-widget rc-fonts-Message">' + keyLabel(cancel) + '</button>' +
      '</div></div></div>';
  }

  function isComplete(item) {
    var ans = state.answers[item.id];
    if (item.type === 'single') return Array.isArray(ans) && ans.length === 1 && !!ans[0];
    if (item.type === 'multiple') return Array.isArray(ans) && ans.length === item.select && ans.every(Boolean);
    if (item.type === 'ordering') return Array.isArray(ans) && ans.length === item.slots.length && item.slots.every(function (_, i) { return !!ans[i]; });
    if (item.type === 'matching') return !!(ans && typeof ans === 'object' && !Array.isArray(ans) && item.prompts.every(function (p) { return !!ans[p.id]; }));
    return false;
  }

  function isCorrect(item) {
    if (!isComplete(item)) return false;
    var ans = state.answers[item.id];
    if (item.type === 'single') return ans[0] === item.answer[0];
    if (item.type === 'multiple') {
      if (ans.length !== item.answer.length) return false;
      return item.answer.every(function (id) { return ans.indexOf(id) >= 0; });
    }
    if (item.type === 'ordering') {
      if (ans.length !== item.answer.length) return false;
      return item.answer.every(function (id, i) { return ans[i] === id; });
    }
    if (item.type === 'matching') {
      return item.prompts.every(function (p) { return ans[p.id] === item.answer[p.id]; });
    }
    return false;
  }

  var DOMAINS = [
    { domain: 1, name: '보안 아키텍처 설계', weight: '30%' },
    { domain: 2, name: '복원력을 갖춘 아키텍처 설계', weight: '26%' },
    { domain: 3, name: '고성능 아키텍처 설계', weight: '24%' },
    { domain: 4, name: '비용에 최적화된 아키텍처 설계', weight: '20%' },
  ];

  function resultBody() {
    var total = exam.items.length;
    var correctCount = exam.items.filter(isCorrect).length;
    var score = total > 0 ? Math.round(100 + 900 * (correctCount / total)) : 100;
    var passed = score >= 720;
    var statusCls = passed ? 'abe-reviewComplete abe-reviewCompleteLabel' : 'abe-reviewIncomplete abe-reviewIncompleteLabel';
    var statusTxt = passed ? '합격' : '불합격';
    var elapsedSec = Math.max(0, exam.durationMinutes * 60 - state.remainingSec);
    var elapsedHtml = state.mode === 'exam' ?
      '<div class="abe-resultMetric"><span>소요 시간</span><strong id="abe-resultElapsed">' + mmss(elapsedSec) + '</strong></div>' : '';

    var domainRows = DOMAINS.map(function (d, idx) {
      var last = idx === DOMAINS.length - 1;
      var dItems = exam.items.filter(function (it) { return it.domain === d.domain; });
      var dTotal = dItems.length;
      var dCorrect = dItems.filter(isCorrect).length;
      var pct = dTotal > 0 ? Math.round(100 * dCorrect / dTotal) : 0;
      var ok = pct >= 70;
      var dStCls = ok ? 'abe-reviewComplete abe-reviewCompleteLabel' : 'abe-reviewIncomplete abe-reviewIncompleteLabel';
      var dStTxt = ok ? '역량 충족' : '개선 필요';
      return '<tr class="abe-reviewTrClass abe-reviewItemEntry abe-reviewTableRowPosition" data-domain="' + d.domain + '">' +
        '<th scope="row" class="abe-reviewTdClass abe-reviewScreenQuestionFont' + (last ? ' abe-reviewBottomLeftTableCorner' : '') + '">' + d.domain + '</th>' +
        '<td class="abe-reviewTdClass abe-reviewScreenTitleFont">' + esc(d.name) + '</td>' +
        '<td class="abe-reviewTdClass abe-reviewScreenTitleFont">' + d.weight + '</td>' +
        '<td class="abe-reviewTdClass abe-reviewScreenTitleFont abe-domainAccuracy">' + pct + '%</td>' +
        '<td class="abe-reviewTdClass' + (last ? ' abe-reviewBottomRightTableCorner' : '') + '"><div class="abe-reviewItemStatus ' + dStCls + ' abe-reviewScreenStatusFont"> ' + dStTxt + ' </div></td></tr>';
    }).join('');

    return '<div id="abe-resultScreen" class="abe-reviewScreen-2-0" tabindex="-1"><div class="abe-reviewScreenHeader">' +
      '<div class="abe-reviewTypeTitle-2-0 rc-fonts-Normal"><h3 class="abe-reviewHeading"> 시험 결과 </h3></div></div>' +
      '<div class="abe-scrollableReviewContent abe-reviewScreenTab" id="scrollableReviewContent" style="overflow: clip auto; height: unset;"><div class="abe-multipleSections abe-tabbedMultipleSection">' +
      '<div id="abe-resultCard" class="abe-resultCard">' +
      '<div class="abe-resultScoreRow"><span class="abe-resultScoreLabel">환산 점수</span><strong id="abe-resultScore" class="abe-resultScoreValue">' + score + '</strong><span class="abe-resultScoreMax"> / 1000</span>' +
      '<div id="abe-resultStatus" class="abe-reviewItemStatus ' + statusCls + ' abe-reviewScreenStatusFont"> ' + statusTxt + ' </div></div>' +
      '<div class="abe-resultMeta">' +
      '<div class="abe-resultMetric"><span>합격 기준</span><strong>720</strong></div>' +
      '<div class="abe-resultMetric"><span>정답 수</span><strong id="abe-resultCorrect">' + correctCount + ' / ' + total + '</strong></div>' +
      elapsedHtml +
      '</div></div>' +
      '<div class="abe-reviewTable" id="abe-domainTable"><div class="abe-tbl-content">' +
      '<table class="abe-reviewTableClass" cellpadding="0" cellspacing="0" border="0" aria-label="영역별 성적">' +
      '<thead class="abe-reviewTheadClass"><tr class="abe-reviewTrClass abe-reviewThFonts">' +
      '<th scope="col" class="abe-reviewTdClass abe-reviewTopLeftTableCorner" width="10%">영역</th>' +
      '<th scope="col" class="abe-reviewTdClass" width="38%">이름</th>' +
      '<th scope="col" class="abe-reviewTdClass" width="14%">비중</th>' +
      '<th scope="col" class="abe-reviewTdClass" width="16%">정답률</th>' +
      '<th scope="col" class="abe-reviewTdClass abe-reviewTopRightTableCorner" width="22%">수준</th>' +
      '</tr></thead><tbody class="abe-reviewTbodyClass">' + domainRows + '</tbody></table></div></div>' +
      '</div></div></div>';
  }

  function reviewTable(sec, entries, visible) {
    var qH = label('UserInterface.ReviewScreen2.0.Property.QuestionHeader2.0.value');
    var tH = label('UserInterface.ReviewScreen2.0.Property.TitleHeader2.0.value');
    var sH = label('UserInterface.ReviewScreen2.0.Property.StatusHeader2.0.value');
    var fH = label('UserInterface.ReviewScreen2.0.Property.FlaggedHeader2.0.value');
    var rH = label('UserInterface.ReviewScreen2.0.AccessibleDescription.Property.ReviewButtons2.0.value');
    var qTitle = label('UserInterface.ReviewScreen.Property.DefaultQuestionTitle.value');
    var compL = label('UserInterface.ReviewScreen2.0.Property.CompleteStatusLabel2.0.value');
    var incL = label('UserInterface.ReviewScreen.CompleteStatuses.Property.IncompleteLabel.value');
    var yesL = label('UserInterface.ReviewScreen2.0.Property.ReviewFlagYes2.0.value');
    var noL = label('UserInterface.ReviewScreen2.0.Property.ReviewFlagNo2.0.value');
    var revL = label('UserInterface.ReviewScreen2.0.Property.ReviewButton2.0.value');
    var rows = entries.length === 0 ?
      '<tr class="abe-reviewTrClass abe-reviewItemEntry abe-reviewTableRowPosition">' +
      '<td class="abe-reviewTdClass">' + esc(label('UserInterface.ReviewScreen2.0.Property.NoRecord2.0.value')) + '</td>' +
      '<td class="abe-reviewTdClass">&nbsp;</td><td class="abe-reviewTdClass">&nbsp;</td><td class="abe-reviewTdClass">&nbsp;</td><td class="abe-reviewTdClass">&nbsp;</td></tr>' :
      entries.map(function (e, idx) {
        var last = idx === entries.length - 1;
        var done = isComplete(e.item), flg = !!state.flags[e.item.id];
        var stCls = done ? 'abe-reviewComplete abe-reviewCompleteLabel' : 'abe-reviewIncomplete abe-reviewIncompleteLabel';
        var stTxt = done ? compL : incL;
        var flgTd = flg ?
          '<td class="abe-reviewTdClass abe-reviewTdClassFlagged" data-cell="' + esc(fH) + '"><div class="abe-FlagForReviewMain">' +
          '<div class="abe-FlagForReviewReviewScreenButton-2-0 abe-reviewScreenTitleFont">' + esc(yesL) + '</div>' +
          '<div class="abe-FlagForReviewReviewScreen-2-0-ButtonSelected abe-FlagForReviewReviewScreenButtonSelected"></div></div></td>' :
          '<td class="abe-reviewTdClass" data-cell="' + esc(fH) + '"><div class="abe-FlagForReviewReviewScreenButton-2-0 abe-reviewScreenTitleFont">' + esc(noL) + '</div></td>';
        return '<tr class="abe-reviewTrClass abe-reviewItemEntry abe-reviewTableRowPosition">' +
          '<th scope="row" class="abe-reviewTdClass abe-reviewScreenQuestionFont' + (last ? ' abe-reviewBottomLeftTableCorner' : '') + '" data-cell="' + esc(qH) + '">' + e.num + '</th>' +
          '<td class="abe-reviewTdClass abe-reviewScreenTitleFont" data-cell="' + esc(tH) + '"> ' + esc(qTitle) + ' </td>' +
          '<td class="abe-reviewTdClass" data-cell="' + esc(sH) + '"><div class="abe-reviewItemStatus ' + stCls + ' abe-reviewScreenStatusFont"> ' + esc(stTxt) + ' </div></td>' +
          flgTd +
          '<td class="abe-reviewTdClass' + (last ? ' abe-reviewBottomRightTableCorner' : '') + '" style="position: relative"><div id="abe-reviewItemButton" itemid="' + esc(e.item.id) + '">' +
          '<button class="abe-reviewItemBtn abe-reviewItemTitle ui-button" data-review-index="' + (e.num - 1) + '" aria-label="Review Question ' + e.num + ' ' + esc(qTitle) + ' ">' + esc(revL) + '</button></div></td></tr>';
      }).join('');
    return '<div class="abe-reviewTable" id="abe-reviewTable-' + sec + '"' + (visible ? '' : ' style="display: none;"') + '><div class="abe-tbl-content">' +
      '<table id="' + sec + '" class="abe-reviewTableClass" cellpadding="0" cellspacing="0" border="0" aria-label="content of ' + sec + ' section" tabindex="-1">' +
      '<thead class="abe-reviewTheadClass"><tr class="abe-reviewTrClass abe-reviewThFonts">' +
      '<th scope="col" class="abe-reviewTdClass abe-reviewTopLeftTableCorner" width="10%">' + esc(qH) + '</th>' +
      '<th scope="col" class="abe-reviewTdClass" width="20%">' + esc(tH) + '</th>' +
      '<th scope="col" class="abe-reviewTdClass" width="22%">' + esc(sH) + '</th>' +
      '<th scope="col" class="abe-reviewTdClass" width="20%">' + esc(fH) + '</th>' +
      '<th scope="col" class="abe-reviewTdClass abe-reviewTopRightTableCorner" width="15%"><span class="abe-tranparentHeader">' + esc(rH) + ' </span></th>' +
      '</tr></thead><tbody id="' + sec + 'TbodyContent" class="abe-reviewTbodyClass">' + rows + '</tbody></table></div></div>';
  }

  function reviewBody() {
    var title = label('UserInterface.ReviewScreen2.0.Property.ReviewTitle2.0.value');
    var revAll = label('UserInterface.Buttons.Button.ReviewAll.label');
    var revInc = label('UserInterface.Buttons.Button.ReviewIncomplete.label');
    var revFlg = label('UserInterface.Buttons.Button.ReviewFlagged.label');
    var allL = label('UserInterface.ReviewScreen2.0.Property.AllTab2.0.value');
    var incL = label('UserInterface.ReviewScreen2.0.Property.IncompleteTab2.0.value');
    var flgL = label('UserInterface.ReviewScreen2.0.Property.FlaggedTab2.0.value');
    var incTip = label('UserInterface.ReviewScreen.Property.ReviewScreenToolTipIncomplete2.0.value');
    var flgTip = label('UserInterface.ReviewScreen.Property.ReviewScreenToolTipFlagged2.0.value');
    var allEntries = exam.items.map(function (it, i) { return { item: it, num: i + 1 }; });
    var incEntries = allEntries.filter(function (e) { return !isComplete(e.item); });
    var flgEntries = allEntries.filter(function (e) { return !!state.flags[e.item.id]; });
    var tab = state.reviewTab || 'All';
    if (tab === 'Flagged' && flgEntries.length === 0) tab = 'All';
    var hideFlg = flgEntries.length === 0 ? ' style="display: none;"' : '';
    return '<div class="abe-reviewScreen-2-0" tabindex="-1"><div class="abe-reviewScreenHeader">' +
      '<div class="abe-reviewTypeTitle-2-0 rc-fonts-Normal"><h3 class="abe-reviewHeading"> ' + esc(title) + ' </h3></div>' +
      '<div id="abe-ReviewAllButtonContainer" class="abe-ReviewButtonContainer"' + (tab === 'All' ? '' : ' style="display: none;"') + '><button id="abe-ReviewAllButton" class="abe-reviewBtn rc-fonts-Normal" data-accesskey="A" accesskey="A" style="display: inline-block;">' + keyLabel(revAll) + '</button></div>' +
      '<div id="abe-ReviewIncompleteButtonContainer" class="abe-ReviewButtonContainer"' + (tab === 'Incomplete' ? '' : ' style="display: none;"') + '><button id="abe-ReviewIncompleteButton" class="abe-reviewBtn rc-fonts-Normal" accesskey="I" data-accesskey="I" style="display: inline-block;">' + keyLabel(revInc) + '</button></div>' +
      '<div id="abe-ReviewFlaggedButtonContainer" class="abe-ReviewButtonContainer"' + (tab === 'Flagged' ? '' : ' style="display: none;"') + '><button id="abe-ReviewFlaggedButton" class="abe-reviewBtn rc-fonts-Normal" accesskey="V" data-accesskey="V" style="display: inline-block;">' + keyLabel(revFlg) + '</button></div>' +
      '</div><div id="reviewType" style="display: none"> prescore </div>' +
      '<div class="abe-scrollableReviewContent abe-reviewScreenTab" id="scrollableReviewContent" style="overflow: clip auto; height: unset;"><div class="abe-multipleSections abe-tabbedMultipleSection">' +
      '<div class="abe-reviewScreenSectionTitles"><div class="abe-reviewSectionTitles abe-reviewScreenTitleFonts">' +
      '<div id="tabAll" class="titleTab"><button id="All" class="abe-reviewSectionTitle ui-button' + (tab === 'All' ? ' abe-sectionTitleSelected' : '') + '" value="' + esc(allL) + '" role="tab" aria-selected="' + (tab === 'All') + '"> ' + esc(allL) + ' <div class="abe-reviewTabCount"> ( </div><div id="AllCount">' + allEntries.length + '</div><div> ) </div></button></div>' +
      '<div id="tabIncomplete" class="titleTab"><span class="abe-reviewScreenToolTip" id="abe-reviewScreenToolTipIncomplete" tabindex="-1"> ' + esc(incTip) + ' </span><button id="Incomplete" class="abe-reviewSectionTitle ui-button' + (tab === 'Incomplete' ? ' abe-sectionTitleSelected' : '') + '" aria-describedby="abe-reviewScreenToolTipIncomplete" value="' + esc(incL) + '" role="tab" aria-selected="' + (tab === 'Incomplete') + '"> ' + esc(incL) + ' <div class="abe-reviewTabCount"> ( </div><div id="IncompleteCount">' + incEntries.length + '</div><div> ) </div><div id="IncompleteTooltip" class="abe-reviewScreenToolTipIcon"></div></button></div>' +
      '<div id="tabFlagged" class="titleTab"' + hideFlg + '><span class="abe-reviewScreenToolTip" id="abe-reviewScreenToolTipFlagged" tabindex="-1"> ' + esc(flgTip) + ' </span><button id="Flagged" class="abe-reviewSectionTitle ui-button' + (tab === 'Flagged' ? ' abe-sectionTitleSelected' : '') + '" aria-describedby="abe-reviewScreenToolTipFlagged" value="' + esc(flgL) + '" role="tab" aria-selected="' + (tab === 'Flagged') + '"' + hideFlg + '> ' + esc(flgL) + ' <div class="abe-reviewTabCount"> ( </div><div id="FlaggedCount">' + flgEntries.length + '</div><div> ) </div><div id="FlaggedTooltip" class="abe-reviewScreenToolTipIcon"></div></button></div>' +
      '</div></div>' +
      reviewTable('All', allEntries, tab === 'All') +
      reviewTable('Incomplete', incEntries, tab === 'Incomplete') +
      reviewTable('Flagged', flgEntries, tab === 'Flagged') +
      '</div></div></div>';
  }

  function instructionsDialog() {
    var title = label('UserInterface.ReviewScreen.Property.PreScoreInstructionsTitle2.0.value');
    var info = label('UserInterface.Messages.Message.DialogTypeInfo.text');
    var body = label('UserInterface.ReviewScreen.Property.ReviewScreenInstructions2.0.value').trim();
    var close = label('UserInterface.Buttons.Button.Close.label');
    return '<div tabindex="-1" role="dialog" class="ui-dialog ui-corner-all ui-widget ui-widget-content ui-front modal ui-dialog-buttons ui-draggable Primary abe-ReviewInstructionsDialogMainContent abe-ReviewInstructionsDialog" aria-describedby="instructionsWindow" aria-labelledby="ui-id-75" style="height: auto; width: 817.6px; top: 388.428px; left: 547.006px; z-index: 2147483147;">' +
      '<div class="ui-dialog-titlebar ui-corner-all ui-widget-header ui-helper-clearfix ui-draggable-handle abe-ReviewInstructionsDialogTitleCloseParent">' +
      '<span id="ui-id-75" class="ui-dialog-title rc-fonts-Message abe-ReviewInstructionTitle" tabindex="-1">' + esc(title) + '<span class="abe-ReviewInstructionsDialogHorizontalLine"></span></span>' +
      '<button type="button" class="ui-button ui-corner-all ui-widget ui-button-icon-only ui-dialog-titlebar-close abe-ReviewInstructionsDialogTitleClose" title="Close" id="instructionsWindow-closeBtn" style="display: none;"><span class="ui-button-icon ui-icon ui-icon-closethick"></span><span class="ui-button-icon-space"> </span>Close<span class="abe-ReviewInstructionsDialogHorizontalLine"></span></button></div>' +
      '<div id="instructionsWindow" style="overflow: hidden auto; width: auto; min-height: 53.85px; max-height: none; height: auto;" class="abe-InformationImage info-dialog ui-dialog-content ui-widget-content abe-ReviewInstructionsDialogTitleCloseParent">' +
      '<span class="sr-only">' + esc(info) + '. </span>' +
      '<div class="abe-dialogDiv"><div class="abe-infoDiv abe-ReviewInstructionInfoLI"></div>' +
      '<p tabindex="-1" class="abe-messageText rc-fonts-Message">' + body + '</p></div></div>' +
      '<div class="ui-dialog-buttonpane ui-widget-content ui-helper-clearfix abe-ReviewInstructionsDialogButtonPane">' +
      '<div class="ui-dialog-buttonset position-center">' +
      '<button type="button" id="Close" class="ui-button ui-corner-all ui-widget rc-fonts-Message abe-ReviewInstructionsDialogCloseButton" accesskey="c" aria-label="' + esc(close) + '">' + keyLabel(close) + '</button>' +
      '</div></div></div>';
  }

  function endReviewDialog() {
    var step = state.endReviewStep;
    var incCount = exam.items.filter(function (it) { return !isComplete(it); }).length;
    var base = incCount === 0 ? 'EndReviewPreScoreCompleteItems' : (incCount === 1 ? 'EndReviewPreScoreIncompleteItem' : 'EndReviewPreScoreIncompleteItems');
    var msgId = base + step;
    var titleId = step === 1 ? 'ui-id-76' : 'ui-id-77';
    var title = label('UserInterface.Messages.Message.' + msgId + '.title');
    var rawText = label('UserInterface.Messages.Message.' + msgId + '.text').replace(/\$\{incompleteItems\}/g, String(incCount));
    var msgHtml = '<div>' + rawText.split(/<br\s*\/?>/gi).map(function (c) { return '<p>' + esc(c.trim()) + '</p>'; }).join('') + '</div>';
    var alertType = label('UserInterface.Messages.Message.DialogTypeAlert.text');
    var yes = label('UserInterface.Buttons.Button.Yes.label');
    var no = label('UserInterface.Buttons.Button.No.label');
    return '<div tabindex="-1" role="dialog" class="ui-dialog ui-corner-all ui-widget ui-widget-content ui-front modal ui-dialog-buttons ui-draggable Primary abe-end-review-dialog" aria-describedby="' + msgId + '" aria-labelledby="' + titleId + '" style="height: auto; width: 477.6px; top: 428.428px; left: 717.006px; z-index: 2147483257;">' +
      '<div class="ui-dialog-titlebar ui-corner-all ui-widget-header ui-helper-clearfix ui-draggable-handle">' +
      '<span id="' + titleId + '" class="ui-dialog-title rc-fonts-Message" tabindex="-1">' + esc(title) + '</span>' +
      '<button type="button" class="ui-button ui-corner-all ui-widget ui-button-icon-only ui-dialog-titlebar-close" title="Close" id="' + msgId + '-closeBtn" style="display: none;"><span class="ui-button-icon ui-icon ui-icon-closethick"></span><span class="ui-button-icon-space"> </span>Close</button></div>' +
      '<div id="' + msgId + '" style="overflow: hidden auto; width: auto; min-height: 53.85px; max-height: none; height: auto;" class="abe-WarningImage alert-dialog ui-dialog-content ui-widget-content rc-fonts-ItemText">' +
      '<span class="sr-only">' + esc(alertType) + '. </span>' +
      '<div class="abe-dialogDiv"><div class="abe-infoDiv"></div>' +
      '<p tabindex="-1" class="abe-messageText rc-fonts-Message" data-msg-html="' + esc(msgHtml) + '"></p></div></div>' +
      '<div class="ui-dialog-buttonpane ui-widget-content ui-helper-clearfix"><div class="ui-dialog-buttonset position-center">' +
      '<button type="button" id="Yes" class="ui-button ui-corner-all ui-widget rc-fonts-Message" accesskey="y">' + keyLabel(yes) + '</button>' +
      '<button type="button" id="No" class="ui-button ui-corner-all ui-widget rc-fonts-Message" accesskey="n">' + keyLabel(no) + '</button>' +
      '</div></div></div><div class="ui-widget-overlay ui-front" style="z-index: 100;"></div>';
  }

  function resumeDialog() {
    var msgId = 'ResumeExamDialog';
    var titleId = 'ui-id-resume';
    var title = '이어하기';
    var msgHtml = '<div><p>' + esc('진행 중인 시험이 있습니다. 이어서 진행하시겠습니까?') + '</p></div>';
    var alertType = label('UserInterface.Messages.Message.DialogTypeAlert.text');
    var yes = label('UserInterface.Buttons.Button.Yes.label');
    var no = label('UserInterface.Buttons.Button.No.label');
    return '<div tabindex="-1" role="dialog" class="ui-dialog ui-corner-all ui-widget ui-widget-content ui-front modal ui-dialog-buttons ui-draggable Primary abe-end-review-dialog abe-resume-dialog" aria-describedby="' + msgId + '" aria-labelledby="' + titleId + '" style="height: auto; width: 477.6px; top: 428.428px; left: 717.006px; z-index: 2147483257;">' +
      '<div class="ui-dialog-titlebar ui-corner-all ui-widget-header ui-helper-clearfix ui-draggable-handle">' +
      '<span id="' + titleId + '" class="ui-dialog-title rc-fonts-Message" tabindex="-1">' + esc(title) + '</span>' +
      '<button type="button" class="ui-button ui-corner-all ui-widget ui-button-icon-only ui-dialog-titlebar-close" title="Close" id="' + msgId + '-closeBtn" style="display: none;"><span class="ui-button-icon ui-icon ui-icon-closethick"></span><span class="ui-button-icon-space"> </span>Close</button></div>' +
      '<div id="' + msgId + '" style="overflow: hidden auto; width: auto; min-height: 53.85px; max-height: none; height: auto;" class="abe-WarningImage alert-dialog ui-dialog-content ui-widget-content rc-fonts-ItemText">' +
      '<span class="sr-only">' + esc(alertType) + '. </span>' +
      '<div class="abe-dialogDiv"><div class="abe-infoDiv"></div>' +
      '<p tabindex="-1" class="abe-messageText rc-fonts-Message" data-msg-html="' + esc(msgHtml) + '"></p></div></div>' +
      '<div class="ui-dialog-buttonpane ui-widget-content ui-helper-clearfix"><div class="ui-dialog-buttonset position-center">' +
      '<button type="button" id="Yes" class="ui-button ui-corner-all ui-widget rc-fonts-Message" accesskey="y">' + keyLabel(yes) + '</button>' +
      '<button type="button" id="No" class="ui-button ui-corner-all ui-widget rc-fonts-Message" accesskey="n">' + keyLabel(no) + '</button>' +
      '</div></div></div><div class="ui-widget-overlay ui-front" style="z-index: 100;"></div>';
  }

  function startBody() {
    var examLabel = '시험 모드 (' + exam.durationMinutes + '분, 타이머)';
    var studyLabel = '학습 모드 (타이머 없음, 문항별 정답 확인)';
    return '<div id="abe-startScreen" class="abe-mat-html">' +
      '<h1><p style="font-size:16px"><b>' + esc(exam.title) + '</b></p></h1>' +
      '<p>문항 수: ' + exam.items.length + '문항 · 시험 시간: ' + exam.durationMinutes + '분</p>' +
      '<div class="abe-opt">' +
      '<div class="abe-opt-input"><label class="abe-parentLabel"><input type="radio" name="exam-mode" id="mode-exam" value="exam"' + (state.mode === 'exam' ? ' checked' : '') + '></label></div>' +
      '<label class="abe-opt-text" for="mode-exam"><div class="abe-mat-html">' + esc(examLabel) + '</div></label></div>' +
      '<div class="abe-opt">' +
      '<div class="abe-opt-input"><label class="abe-parentLabel"><input type="radio" name="exam-mode" id="mode-study" value="study"' + (state.mode === 'study' ? ' checked' : '') + '></label></div>' +
      '<label class="abe-opt-text" for="mode-study"><div class="abe-mat-html">' + esc(studyLabel) + '</div></label></div>' +
      '</div>';
  }

  function render() {
    var item = exam.items[state.index];
    saveState();
    if (state.phase === 'start') {
      app.innerHTML = titleBar(item) + toolBar() +
        '<div id="abe-contentPane" class="Content rc-fonts-ItemText" dir="ltr" tabindex="-1" role="main"><div id="abe-readMe" class="contentPaneLanguageWrapper dynamicContent heightRoot" dir="ltr" tabindex="0">' +
        '<div class="abe-content-root">' + startBody() + '</div></div></div>' + navBar() + (state.resumeSaved ? resumeDialog() : '');
      var rMsgP = app.querySelector('.abe-messageText[data-msg-html]');
      if (rMsgP) rMsgP.innerHTML = rMsgP.getAttribute('data-msg-html');
      return;
    }
    if (state.phase === 'review') {
      app.innerHTML = titleBar(item) + toolBar() +
        '<div id="abe-contentPane" class="Content rc-fonts-ItemText" dir="ltr" tabindex="-1" role="main" style="background-color: rgb(242, 243, 245);"><div id="abe-readMe" class="contentPaneLanguageWrapper dynamicContent heightRoot" dir="ltr" tabindex="0">' +
        reviewBody() + '</div></div>' + navBar() + (state.instructionsOpen ? instructionsDialog() : '') + (state.endReviewStep ? endReviewDialog() : '');
      var msgP = app.querySelector('.abe-messageText[data-msg-html]');
      if (msgP) msgP.innerHTML = msgP.getAttribute('data-msg-html');
      return;
    }
    if (state.phase === 'result') {
      app.innerHTML = titleBar(item) + toolBar() +
        '<div id="abe-contentPane" class="Content rc-fonts-ItemText" dir="ltr" tabindex="-1" role="main" style="background-color: rgb(242, 243, 245);"><div id="abe-readMe" class="contentPaneLanguageWrapper dynamicContent heightRoot" dir="ltr" tabindex="0">' +
        resultBody() + '</div></div>' + navBar();
      return;
    }
    app.innerHTML = titleBar(item) + toolBar() +
      '<div id="abe-contentPane" class="Content rc-fonts-ItemText" dir="ltr" tabindex="-1" role="main"><div id="abe-readMe" class="contentPaneLanguageWrapper dynamicContent heightRoot" dir="ltr" tabindex="0">' +
      '<div class="abe-content-root">' + itemBody(item) + '</div></div></div>' + navBar() + (state.english ? englishDialog(item) : '') + (state.commentOpen ? commentDialog(item) : '');
    // jQuery UI selectmenu는 버튼 너비를 정수로 올림하므로 같게 맞춘다.
    var btns = app.querySelectorAll('.abe-slot .ui-selectmenu-button');
    for (var b = 0; b < btns.length; b++) btns[b].style.width = Math.ceil(btns[b].getBoundingClientRect().width) + 'px';
  }

  function go(i) {
    state.index = Math.max(0, Math.min(exam.items.length - 1, i));
    state.english = false;
    state.commentOpen = false;
    render();
  }

  function tick() {
    if (frozen || state.mode !== 'exam' || (state.phase !== 'item' && state.phase !== 'review')) return;
    state.remainingSec = Math.max(0, state.remainingSec - 1);
    tickCount++;
    if (state.remainingSec <= 0) {
      state.phase = 'result';
      state.english = false;
      state.commentOpen = false;
      state.instructionsOpen = false;
      state.endReviewStep = 0;
      state.schemeOpen = false;
      render();
      return;
    }
    if (tickCount >= 5) {
      saveState();
    }
    var el = document.getElementById('timeRemaining');
    if (el) el.textContent = mmss(state.remainingSec);
    var acc = document.getElementById('accessibleTimerText');
    if (acc) {
      var min = Math.floor(state.remainingSec / 60), sec = state.remainingSec % 60;
      acc.textContent = label('Timing.Property.HideTimer.value') + ' 남은 시간 ' + min + ' 분, ' + sec + ' 초';
    }
  }
  setInterval(tick, 1000);

  // Alt+글자: 브라우저별 accesskey 조합 차이를 없애려고 직접 처리한다(이중 실행 방지로 기본 동작은 막는다).
  document.addEventListener('keydown', function (e) {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.key.length !== 1) return;
    var b = app.querySelector('button[accesskey="' + e.key.toUpperCase() + '"], button[accesskey="' + e.key.toLowerCase() + '"]');
    if (!b) return;
    e.preventDefault();
    b.click();
  });

  function selectReviewTab(sec) {
    state.reviewTab = sec;
    var tabs = app.querySelectorAll('.abe-reviewSectionTitle');
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].id === sec;
      tabs[i].classList.toggle('abe-sectionTitleSelected', on);
      tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    var tbls = app.querySelectorAll('.abe-reviewTable');
    for (var j = 0; j < tbls.length; j++) {
      tbls[j].style.display = tbls[j].id === 'abe-reviewTable-' + sec ? '' : 'none';
    }
    var btns = app.querySelectorAll('.abe-ReviewButtonContainer');
    for (var k = 0; k < btns.length; k++) {
      btns[k].style.display = btns[k].id === 'abe-Review' + sec + 'ButtonContainer' ? '' : 'none';
    }
  }

  app.addEventListener('focusin', function (e) {
    var tab = e.target.closest('.abe-reviewSectionTitle');
    if (!tab) return;
    var tips = app.querySelectorAll('.abe-reviewScreenToolTip');
    for (var i = 0; i < tips.length; i++) tips[i].style.display = 'none';
    var tip = document.getElementById('abe-reviewScreenToolTip' + tab.id);
    if (tip) tip.style.display = 'inline';
  });

  app.addEventListener('focusout', function (e) {
    var tab = e.target.closest('.abe-reviewSectionTitle');
    if (!tab) return;
    var tips = app.querySelectorAll('.abe-reviewScreenToolTip');
    for (var i = 0; i < tips.length; i++) tips[i].style.display = 'none';
  });

  app.addEventListener('mouseover', function (e) {
    var ic = e.target.closest('.abe-reviewScreenToolTipIcon');
    if (!ic || !ic.parentElement) return;
    var tip = document.getElementById('abe-reviewScreenToolTip' + ic.parentElement.id);
    if (tip) tip.style.display = 'inline';
  });

  app.addEventListener('mouseout', function (e) {
    var ic = e.target.closest('.abe-reviewScreenToolTipIcon');
    if (!ic || !ic.parentElement || document.activeElement === ic.parentElement) return;
    var tip = document.getElementById('abe-reviewScreenToolTip' + ic.parentElement.id);
    if (tip) tip.style.display = 'none';
  });

  app.addEventListener('click', function (e) {
    var mi = e.target.closest('#colorSchemes-menu li');
    if (mi) { state.schemeOpen = false; render(); return; }
    var sb = e.target.closest('#colorSchemes-button');
    if (sb) { state.schemeOpen = !state.schemeOpen; render(); return; }
    if (state.schemeOpen) { state.schemeOpen = false; render(); }
    var t = e.target.closest('button, input');
    if (!t) return;
    if (t.classList.contains('abe-reviewSectionTitle')) { selectReviewTab(t.id); return; }
    if (t.id === 'abe-ReviewInstructionsButton') { state.instructionsOpen = true; render(); return; }
    if (t.id === 'Close') { state.instructionsOpen = false; render(); return; }
    if (t.id === 'abe-EndReviewButton') { state.instructionsOpen = false; state.endReviewStep = 1; render(); return; }
    if (t.id === 'Yes' && state.resumeSaved) {
      var saved = state.resumeSaved;
      state.resumeSaved = null;
      applySavedState(saved);
      render();
      return;
    }
    if (t.id === 'No' && state.resumeSaved) {
      state.resumeSaved = null;
      clearSavedState();
      resetState();
      render();
      return;
    }
    if (t.id === 'Yes' && state.endReviewStep) {
      if (state.endReviewStep === 1) { state.endReviewStep = 2; render(); }
      else { state.endReviewStep = 0; state.phase = 'result'; render(); }
      return;
    }
    if (t.id === 'No' && state.endReviewStep) { state.endReviewStep = 0; render(); return; }
    if (t.classList.contains('abe-reviewItemBtn')) {
      state.phase = 'item';
      state.fromReview = true;
      state.reviewList = null;
      state.instructionsOpen = false;
      go(+t.getAttribute('data-review-index'));
      return;
    }
    if (t.id === 'abe-ReviewAllButton') {
      state.phase = 'item';
      state.fromReview = true;
      state.reviewList = null;
      state.instructionsOpen = false;
      go(0);
      return;
    }
    if (t.id === 'abe-ReviewIncompleteButton' || t.id === 'abe-ReviewFlaggedButton') {
      var isInc = t.id === 'abe-ReviewIncompleteButton';
      var list = [];
      exam.items.forEach(function (it, idx) {
        if (isInc ? !isComplete(it) : !!state.flags[it.id]) list.push(idx);
      });
      if (list.length > 0) {
        state.phase = 'item';
        state.fromReview = true;
        state.reviewList = list;
        state.instructionsOpen = false;
        go(list[0]);
      }
      return;
    }
    if (t.id === 'abe-ReviewScreenButton') {
      state.phase = 'review';
      state.reviewTab = 'All';
      state.fromReview = false;
      state.reviewList = null;
      state.english = false;
      state.commentOpen = false;
      state.instructionsOpen = false;
      render();
      return;
    }
    if (t.id === 'exhibit1' || t.closest('#exhibit1')) { state.english = true; render(); }
    else if (t.id === 'abe-CommentButton') { state.commentOpen = true; render(); }
    else if (t.id === 'SAVE' || t.id === 'CANCEL') {
      var cid = exam.items[state.index].id, ta = document.getElementById('abe-commentTxt');
      if (t.id === 'SAVE') { if (ta.value) state.comments[cid] = ta.value; else delete state.comments[cid]; }
      state.commentOpen = false; render();
    }
    else if (t.id === 'abe-eng-close') { state.english = false; render(); }
    else if (t.id === 'abe-NextButton') {
      if (state.phase === 'start') {
        state.resumeSaved = null;
        state.phase = 'item';
        state.fromReview = false;
        state.reviewList = null;
        state.remainingSec = exam.durationMinutes * 60;
        state.startedAt = Date.now();
        go(0);
        return;
      }
      if (state.reviewList) {
        var pos = state.reviewList.indexOf(state.index);
        if (pos >= 0 && pos < state.reviewList.length - 1) {
          go(state.reviewList[pos + 1]);
          return;
        }
      } else if (state.index < exam.items.length - 1) {
        go(state.index + 1);
        return;
      }
      state.phase = 'review';
      state.reviewTab = 'All';
      state.fromReview = false;
      state.reviewList = null;
      state.english = false;
      state.commentOpen = false;
      render();
    }
    else if (t.id === 'abe-PreviousButton') {
      if (state.reviewList) {
        var ppos = state.reviewList.indexOf(state.index);
        if (ppos > 0) go(state.reviewList[ppos - 1]);
      } else {
        go(state.index - 1);
      }
    }
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
    if (t && t.tagName === 'INPUT' && t.name === 'exam-mode') {
      state.mode = t.value;
      return;
    }
    if (t && t.tagName === 'SELECT' && t.hasAttribute('data-slot')) {
      var it = exam.items[state.index];
      if (it.type === 'matching') {
        var map = Object.assign({}, state.answers[it.id]);
        var pid = it.prompts[+t.getAttribute('data-slot')].id;
        if (t.value) map[pid] = t.value; else delete map[pid];
        state.answers[it.id] = map;
        render();
        return;
      }
      var arr = (state.answers[it.id] || []).slice();
      while (arr.length < it.slots.length) arr.push(null);
      arr[+t.getAttribute('data-slot')] = t.value || null;
      state.answers[it.id] = arr;
      render();
      return;
    }
    if (!t || t.tagName !== 'INPUT' || !/^response-/.test(t.name)) return;
    var qid = t.name.slice('response-'.length);
    var cur = state.answers[qid] || [];
    if (t.type === 'radio') cur = [t.value];
    else cur = t.checked ? cur.concat(t.value) : cur.filter(function (v) { return v !== t.value; });
    state.answers[qid] = cur;
    saveState();
  });

  var initialSaved = readSavedState();
  if (initialSaved) {
    state.resumeSaved = initialSaved;
  }
  render();

  if (/[?&]test=1/.test(location.search)) {
    window.__exam = {
      load: function (s) {
        frozen = false;
        state.reviewTab = 'All';
        state.fromReview = false;
        state.reviewList = null;
        state.instructionsOpen = false;
        state.endReviewStep = 0;
        state.resumeSaved = null;
        for (var k in s) state[k] = s[k];
        if (state.phase === 'start') clearSavedState();
        render();
      },
      setRemaining: function (sec) { frozen = true; state.remainingSec = sec; render(); },
      state: state,
    };
  }
})();
