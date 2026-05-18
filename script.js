const editor = document.getElementById('editor');
let savedSel = null;
let currentZoom = 100;
let autoSaveTimer;

// ===== EXECCOMMAND WRAPPER =====
function execCmd(cmd, val = null) {
  editor.focus();
  if (savedSel) restoreSelection();
  document.execCommand(cmd, false, val);
  updateToolbarState();
  scheduleAutoSave();
}

// ===== FONT =====
function setFont(family) {
  execCmd('fontName', family);
}

function setFontSize(size) {
  // execCommand fontSize only takes 1-7, so use span instead
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;
  const span = document.createElement('span');
  span.style.fontSize = size + 'pt';
  range.surroundContents(span);
  scheduleAutoSave();
}

// ===== HEADING =====
function setHeading(tag) {
  editor.focus();
  document.execCommand('formatBlock', false, tag);
  scheduleAutoSave();
}

// ===== COLORS =====
const textColors = ['#000000','#1a1a2e','#2d3561','#4361ee','#3a0ca3','#7209b7','#f72585',
  '#e63946','#ef233c','#e76f51','#f4a261','#e9c46a','#2a9d8f','#06d6a0','#52b788',
  '#ffffff','#f8f9fa','#e9ecef','#dee2e6','#ced4da','#6c757d','#495057','#343a40',
  '#89b4fa','#cba6f7','#a6e3a1','#f9e2af','#fab387','#f38ba8','#eba0ac','#74c7ec'];

const bgColors = ['#fef3c7','#fde68a','#fcd34d','#fbbf24','#fed7aa','#fdba74','#fca5a5',
  '#f87171','#fbcfe8','#f9a8d4','#e9d5ff','#d8b4fe','#c7d2fe','#a5b4fc','#bfdbfe','#93c5fd',
  '#bbf7d0','#86efac','#d1fae5','#a7f3d0','#e0f2fe','#bae6fd','#f0fdf4','#ffffff',
  '#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8','#64748b','#334155','#1e293b','#0f172a'];

function buildColorGrid(gridId, colors, applyFn) {
  const grid = document.getElementById(gridId);
  colors.forEach(c => {
    const s = document.createElement('div');
    s.className = 'color-swatch';
    s.style.background = c;
    s.title = c;
    s.onclick = () => applyFn(c);
    grid.appendChild(s);
  });
}

buildColorGrid('textColorGrid', textColors, applyTextColor);
buildColorGrid('bgColorGrid', bgColors, applyBgColor);

function applyTextColor(color) {
  saveSelection();
  editor.focus();
  restoreSelection();
  document.execCommand('foreColor', false, color);
  document.getElementById('textColorInd').style.background = color;
  closeAllColorPickers();
  scheduleAutoSave();
}

function applyBgColor(color) {
  saveSelection();
  editor.focus();
  restoreSelection();
  document.execCommand('hiliteColor', false, color);
  document.getElementById('bgColorInd').style.background = color;
  closeAllColorPickers();
  scheduleAutoSave();
}

function toggleColorPicker(type) {
  saveSelection();
  const tp = document.getElementById('textColorPicker');
  const bp = document.getElementById('bgColorPicker');
  if (type === 'textColor') {
    const open = tp.classList.contains('open');
    bp.classList.remove('open');
    tp.classList.toggle('open', !open);
  } else {
    const open = bp.classList.contains('open');
    tp.classList.remove('open');
    bp.classList.toggle('open', !open);
  }
}

function closeAllColorPickers() {
  document.querySelectorAll('.color-picker-dropdown').forEach(p => p.classList.remove('open'));
}

// ===== SELECTION SAVE/RESTORE =====
function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) savedSel = sel.getRangeAt(0).cloneRange();
}

function restoreSelection() {
  if (!savedSel) return;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(savedSel);
}

editor.addEventListener('mouseup', saveSelection);
editor.addEventListener('keyup', saveSelection);

// ===== TABLE =====
function openTableModal() {
  saveSelection();
  closeAllMenus();
  document.getElementById('tableModal').classList.add('open');
}

function insertTable() {
  const rows = parseInt(document.getElementById('tableRows').value) || 3;
  const cols = parseInt(document.getElementById('tableCols').value) || 3;
  const header = document.getElementById('tableHeader').value === 'yes';
  const style = document.getElementById('tableStyle').value;

  let html = '<table>';
  if (header) {
    html += '<thead><tr>';
    for (let c = 0; c < cols; c++) html += `<th>Header ${c + 1}</th>`;
    html += '</tr></thead>';
  }
  html += '<tbody>';
  for (let r = 0; r < (header ? rows - 1 : rows); r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) html += `<td>Cell</td>`;
    html += '</tr>';
  }
  html += '</tbody></table><p></p>';

  editor.focus();
  restoreSelection();
  document.execCommand('insertHTML', false, html);
  closeModal('tableModal');
  scheduleAutoSave();
}

// ===== IMAGE =====
function insertImage() {
  saveSelection();
  closeAllMenus();
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      editor.focus();
      restoreSelection();
      document.execCommand('insertHTML', false, `<img src="${ev.target.result}" alt="${file.name}" style="max-width:100%"><p></p>`);
      scheduleAutoSave();
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ===== LINK =====
let savedLinkSel = null;
function insertLink() {
  saveSelection();
  savedLinkSel = savedSel ? savedSel.cloneRange() : null;
  closeAllMenus();
  const sel = window.getSelection();
  document.getElementById('linkText').value = sel.toString() || '';
  document.getElementById('linkUrl').value = '';
  document.getElementById('linkModal').classList.add('open');
}

function applyLink() {
  const text = document.getElementById('linkText').value || document.getElementById('linkUrl').value;
  const url = document.getElementById('linkUrl').value;
  const target = document.getElementById('linkTarget').value;
  if (!url) { closeModal('linkModal'); return; }
  editor.focus();
  if (savedLinkSel) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedLinkSel);
  }
  document.execCommand('insertHTML', false, `<a href="${url}" target="${target}">${text}</a>`);
  closeModal('linkModal');
  scheduleAutoSave();
}

// ===== HORIZONTAL RULE =====
function insertHR() {
  closeAllMenus();
  editor.focus();
  document.execCommand('insertHTML', false, '<hr><p></p>');
  scheduleAutoSave();
}

// ===== CODE BLOCK =====
function insertCodeBlock() {
  closeAllMenus();
  editor.focus();
  document.execCommand('insertHTML', false, '<pre>// Your code here\n</pre><p></p>');
  scheduleAutoSave();
}

// ===== PAGE BREAK =====
function insertPageBreak() {
  closeAllMenus();
  editor.focus();
  document.execCommand('insertHTML', false, '<div style="page-break-after:always;border-top:2px dashed #ccc;margin:20px 0;"><span style="font-size:10px;color:#999;">â€” Page Break â€”</span></div><p></p>');
  scheduleAutoSave();
}

// ===== CLEAR FORMATTING =====
function clearFormatting() {
  closeAllMenus();
  execCmd('removeFormat');
}

// ===== MODALS =====
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ===== MENUS =====
function toggleMenu(el) {
  const isActive = el.classList.contains('active');
  closeAllMenus();
  if (!isActive) el.classList.add('active');
}

function closeAllMenus() {
  document.querySelectorAll('.menu-item.active').forEach(m => m.classList.remove('active'));
}

document.addEventListener('click', e => {
  if (!e.target.closest('.menu-item')) closeAllMenus();
  if (!e.target.closest('.color-picker-dropdown') && !e.target.closest('.tb-btn')) closeAllColorPickers();
});

// ===== FIND & REPLACE =====
let findMatches = [];
let findIdx = 0;

function openFindBar() {
  closeAllMenus();
  document.getElementById('findBar').classList.add('open');
  document.getElementById('findInput').focus();
}

function closeFindBar() {
  document.getElementById('findBar').classList.remove('open');
  clearHighlights();
}

function findText() {
  clearHighlights();
  const term = document.getElementById('findInput').value;
  if (!term) { document.getElementById('findStatus').textContent = ''; return; }
  const text = editor.innerHTML;
  const re = new RegExp(escapeRe(term), 'gi');
  let count = 0;
  editor.innerHTML = editor.innerHTML.replace(re, m => {
    count++;
    return `<mark class="search-highlight" data-find="${count}">${m}</mark>`;
  });
  findMatches = editor.querySelectorAll('mark.search-highlight');
  findIdx = 0;
  document.getElementById('findStatus').textContent = count ? `${count} result(s)` : 'No results';
  if (findMatches[0]) findMatches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  scheduleAutoSave();
}

function findNext() {
  if (!findMatches.length) return;
  findIdx = (findIdx + 1) % findMatches.length;
  findMatches[findIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function findPrev() {
  if (!findMatches.length) return;
  findIdx = (findIdx - 1 + findMatches.length) % findMatches.length;
  findMatches[findIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearHighlights() {
  editor.querySelectorAll('mark.search-highlight').forEach(m => {
    const parent = m.parentNode;
    parent.replaceChild(document.createTextNode(m.textContent), m);
    parent.normalize();
  });
  findMatches = [];
}

function replaceOne() {
  const find = document.getElementById('findInput').value;
  const rep = document.getElementById('replaceInput').value;
  if (!find || !findMatches.length) return;
  findMatches[findIdx].outerHTML = rep;
  findText();
}

function replaceAll() {
  const find = document.getElementById('findInput').value;
  const rep = document.getElementById('replaceInput').value;
  if (!find) return;
  clearHighlights();
  const re = new RegExp(escapeRe(find), 'gi');
  editor.innerHTML = editor.innerHTML.replace(re, rep);
  document.getElementById('findStatus').textContent = 'Replaced all';
  scheduleAutoSave();
}

function escapeRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ===== ZOOM =====
function setZoom(val) {
  closeAllMenus();
  currentZoom = Math.max(50, Math.min(200, val));
  document.getElementById('pageEl').style.transform = `scale(${currentZoom / 100})`;
  document.getElementById('pageEl').style.transformOrigin = 'top center';
  document.getElementById('zoomVal').textContent = currentZoom + '%';
  document.getElementById('statusZoom').textContent = currentZoom + '%';
}

function adjustZoom(delta) {
  setZoom(currentZoom + delta);
}

// ===== TOOLBAR STATE =====
function updateToolbarState() {
  const cmds = ['bold', 'italic', 'underline', 'strikeThrough', 'superscript', 'subscript',
    'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
    'insertUnorderedList', 'insertOrderedList'];
  cmds.forEach(cmd => {
    const btn = document.getElementById('btn-' + cmd);
    if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
  });
}

editor.addEventListener('keyup', updateToolbarState);
editor.addEventListener('mouseup', updateToolbarState);
editor.addEventListener('selectionchange', updateToolbarState);

// ===== WORD COUNT =====
function updateStats() {
  const text = editor.innerText || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const lines = text.split('\n').length;
  document.getElementById('wordCount').textContent = words;
  document.getElementById('charCount').textContent = chars;
  document.getElementById('lineCount').textContent = lines;
}

editor.addEventListener('input', () => {
  updateStats();
  scheduleAutoSave();
});

function toggleWordCount() {
  closeAllMenus();
  updateStats();
  alert(`Words: ${document.getElementById('wordCount').textContent}\nCharacters: ${document.getElementById('charCount').textContent}`);
}

// ===== AUTO SAVE (localStorage) =====
function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  document.getElementById('saveStatus').textContent = 'Savingâ€¦';
  autoSaveTimer = setTimeout(saveDoc, 1500);
}

function saveDoc() {
  try {
    localStorage.setItem('docflow_content', editor.innerHTML);
    const now = new Date();
    document.getElementById('saveStatus').textContent = `Saved ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
  } catch(e) {}
}

function newDoc() {
  closeAllMenus();
  if (confirm('Start a new document? Unsaved changes will be lost.')) {
    editor.innerHTML = '<p></p>';
    updateStats();
  }
}

function saveAs(type) {
  closeAllMenus();
  let content, mime, ext;
  if (type === 'html') {
    content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Document</title></head><body>${editor.innerHTML}</body></html>`;
    mime = 'text/html';
    ext = 'html';
  } else {
    content = editor.innerText;
    mime = 'text/plain';
    ext = 'txt';
  }
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `document.${ext}`;
  a.click();
}

// ===== RESTORE SAVED CONTENT =====
try {
  const saved = localStorage.getItem('docflow_content');
  if (saved) editor.innerHTML = saved;
} catch(e) {}

// ===== RULER =====
function drawRuler() {
  const canvas = document.getElementById('rulerCanvas');
  const W = canvas.offsetWidth;
  canvas.width = W;
  canvas.height = 20;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2a2a3e';
  ctx.fillRect(0, 0, W, 20);
  ctx.fillStyle = '#6c7086';
  ctx.font = '9px DM Sans';
  const pageW = 210 * 3.779; // mm to px
  const offset = (W - pageW) / 2;
  for (let i = 0; i <= 210; i += 5) {
    const x = offset + i * 3.779;
    if (x < 0 || x > W) continue;
    const isMajor = i % 10 === 0;
    ctx.fillStyle = isMajor ? '#6c7086' : '#45475a';
    ctx.fillRect(x, isMajor ? 8 : 12, 1, isMajor ? 12 : 8);
    if (isMajor && i > 0) {
      ctx.fillStyle = '#6c7086';
      ctx.fillText(i, x - 5, 8);
    }
  }
}

window.addEventListener('resize', drawRuler);
drawRuler();

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'n': e.preventDefault(); newDoc(); break;
      case 's': e.preventDefault(); saveDoc(); break;
      case 'h': e.preventDefault(); openFindBar(); break;
      case 'z': if (!e.shiftKey) { e.preventDefault(); execCmd('undo'); } break;
      case 'y': e.preventDefault(); execCmd('redo'); break;
    }
  }
  if (e.key === 'Escape') { closeFindBar(); closeAllMenus(); closeAllColorPickers(); }
});

// ===== TAB IN EDITOR =====
editor.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    execCmd('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;');
  }
});

// Init
updateStats();
updateToolbarState();
