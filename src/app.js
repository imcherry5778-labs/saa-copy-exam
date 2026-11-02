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
    remainingSec: exam.durationMinutes * 60, timerHidden: false, counterHidden: false, english: false, commentOpen: false,
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
      '<span class="ui-icon ui-icon-triangle-1-s"></span><span class="ui-selectmenu-text">' + esc(cur ? cur.ko : ph) + '</span>' +
      '<span class="abe-ghost" aria-hidden="true">' + ghost + '</span>' +
      '<select class="abe-drop_down" data-slot="' + i + '" aria-label="' + esc(name) + '">' + opts + '</select></span></span>';
  }

  function orderingBody(item) {
    var sel = state.answers[item.id] || [];
    var html = '<div class="abe-ordering">';
    html += '<ul class="abe-choice-list">' + item.choices.map(function (c) { return '<li> ' + esc(c.ko) + '</li>'; }).join('') + '</ul>';
    html += '<div class="abe-slot-gap">&nbsp;</div>';
    item.slots.forEach(function (sl, i) {
      var lab = sl.label ? esc(sl.label.ko) : '';
      var dd = slotSelect(item, i, sel[i] || null, sl.label ? sl.label.ko : '슬롯 ' + (i + 1));
      html += '<div class="abe-slot">' + (sl.side === 'left' ? (lab ? lab + '&nbsp;&nbsp;&nbsp;&nbsp;' : '') + dd : dd + (lab ? '&nbsp;' + lab : '')) + '</div>';
      if (i < item.slots.length - 1) html += '<div class="abe-slot-gap">&nbsp;</div>';
    });
    return html + '</div>';
  }

  // matching: 범주 목록 + prompt별 드롭다운(라벨은 왼쪽). 답은 {promptId: choiceId}.
  function matchingBody(item) {
    var sel = state.answers[item.id] || {};
    var html = '<div class="abe-ordering">';
    html += '<ul class="abe-choice-list">' + item.choices.map(function (c) { return '<li> ' + esc(c.ko) + '</li>'; }).join('') + '</ul>';
    item.prompts.forEach(function (pr, i) {
      html += '<div class="abe-slot">' + esc(pr.ko) + '&nbsp;&nbsp; ' + slotSelect(item, i, sel[pr.id] || null, pr.ko) + '</div>';
      if (i < item.prompts.length - 1) html += '<div class="abe-slot-gap">&nbsp;</div>';
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

  function render() {
    var item = exam.items[state.index];
    app.innerHTML = titleBar(item) + toolBar() +
      '<div id="abe-contentPane" class="Content rc-fonts-ItemText" dir="ltr" tabindex="-1" role="main"><div id="abe-readMe" class="contentPaneLanguageWrapper dynamicContent heightRoot" dir="ltr" tabindex="0">' +
      '<div class="abe-content-root">' + itemBody(item) + '</div></div></div>' + navBar() + (state.english ? englishDialog(item) : '') + (state.commentOpen ? commentDialog(item) : '');
  }

  function go(i) {
    state.index = Math.max(0, Math.min(exam.items.length - 1, i));
    state.english = false;
    state.commentOpen = false;
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
    if (t.id === 'exhibit1' || t.closest('#exhibit1')) { state.english = true; render(); }
    else if (t.id === 'abe-CommentButton') { state.commentOpen = true; render(); }
    else if (t.id === 'SAVE' || t.id === 'CANCEL') {
      var cid = exam.items[state.index].id, ta = document.getElementById('abe-commentTxt');
      if (t.id === 'SAVE') { if (ta.value) state.comments[cid] = ta.value; else delete state.comments[cid]; }
      state.commentOpen = false; render();
    }
    else if (t.id === 'abe-eng-close') { state.english = false; render(); }
    else if (t.id === 'abe-NextButton') go(state.index + 1);
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
