/* ===== LINKCHANNEL — Main App ===== */

let state = {
  data: null,
  currentPage: 0,
  adminPassword: '',
  folderOpen: null,
};

const COLORS = ['icon-color-1','icon-color-2','icon-color-3','icon-color-4','icon-color-5','icon-color-6','icon-color-7','icon-color-8'];
const PRESETS = [
  { label: '深夜紫', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  { label: '深海藍', value: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
  { label: '森林綠', value: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)' },
  { label: '日落橘', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #fda085 100%)' },
  { label: '純黑', value: '#0a0a0a' },
  { label: '純白', value: 'linear-gradient(135deg, #e8ecf0 0%, #f5f7fa 100%)' },
  { label: '極光', value: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)' },
  { label: '玫瑰金', value: 'linear-gradient(135deg, #b06ab3 0%, #4568dc 100%)' },
];

// ===== INIT =====
async function init() {
  updateClock();
  setInterval(updateClock, 1000);
  await loadData();
  applyBackground();
  renderPages();
  renderDots();
}

// ===== DATA =====
async function loadData() {
  try {
    const res = await fetch('api.php?action=load&t=' + Date.now());
    state.data = await res.json();
    if (!state.data.pages || state.data.pages.length === 0) {
      state.data.pages = [{ id: 'page-1', items: [] }];
    }
  } catch (e) {
    console.error('載入失敗', e);
    state.data = {
      settings: { passwordEnabled: false, password: '', background: { type: 'gradient', value: PRESETS[0].value }, darkMode: true, title: 'My Works' },
      pages: [{ id: 'page-1', items: [] }]
    };
  }
}

async function saveData() {
  const payload = { ...state.data, _adminPassword: state.adminPassword };
  const res = await fetch('api.php?action=save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let result;
  try {
    result = await res.json();
  } catch (e) {
    throw new Error('伺服器回應非 JSON（狀態碼 ' + res.status + '）');
  }
  if (!res.ok) throw new Error(result.error || '儲存失敗');
  return result;
}

// ===== BACKGROUND =====
function applyBackground() {
  const bg = state.data.settings.background;
  const el = document.getElementById('bg');
  if (bg.type === 'image') {
    el.style.background = `url('${bg.value}') center/cover no-repeat`;
  } else {
    el.style.background = bg.value;
  }
}

// ===== CLOCK =====
function updateClock() {
  const el = document.querySelector('#statusbar .time');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ===== RENDER =====
function renderPages() {
  const slider = document.getElementById('slider');
  slider.innerHTML = '';

  const playAnim = !sessionStorage.getItem('introPlayed');
  let animIndex = 0;

  state.data.pages.forEach((page, pi) => {
    const pageEl = document.createElement('div');
    pageEl.className = 'page';
    pageEl.dataset.pageIndex = pi;

    if (page.items.length === 0) {
      const cta = document.createElement('div');
      cta.className = 'empty-state';
      cta.innerHTML = `
        <div class="empty-icon">✨</div>
        <div class="empty-title">新增第一個作品</div>
        <div class="empty-desc">長按時間列 3 秒<br>開啟管理後台</div>
      `;
      pageEl.appendChild(cta);
    } else {
      const grid = document.createElement('div');
      grid.className = 'icon-grid';

      page.items.forEach(item => {
        const iconEl = item.type === 'folder'
          ? createFolderIcon(item, pi)
          : createAppIcon(item);

        if (playAnim) {
          iconEl.style.setProperty('--delay', Math.min(animIndex * 0.05, 0.5) + 's');
          iconEl.classList.add('falling');
          animIndex++;
        }

        grid.appendChild(iconEl);
      });

      pageEl.appendChild(grid);
    }

    slider.appendChild(pageEl);
  });

  if (playAnim) sessionStorage.setItem('introPlayed', '1');
  goToPage(state.currentPage, false);
}

function renderDots() {
  const dots = document.getElementById('page-dots');
  dots.innerHTML = '';
  state.data.pages.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i === state.currentPage ? ' active' : '');
    dot.onclick = () => goToPage(i);
    dots.appendChild(dot);
  });
}

// ===== APP ICON =====
function createAppIcon(item) {
  const el = document.createElement('div');
  el.className = 'app-icon';

  const wrap = document.createElement('div');
  wrap.className = 'icon-wrap';

  if (item.iconType === 'image' && item.iconUrl) {
    const img = document.createElement('img');
    img.src = item.iconUrl;
    img.alt = item.name;
    wrap.appendChild(img);
  } else if (item.iconType === 'emoji' || !item.iconType) {
    wrap.textContent = item.icon || '🔗';
    if (item.color) wrap.classList.add(item.color);
  }

  const label = document.createElement('div');
  label.className = 'icon-label';
  label.textContent = item.name;

  el.appendChild(wrap);
  el.appendChild(label);

  // Click / press animation
  el.addEventListener('pointerdown', () => el.classList.add('pressing'));
  el.addEventListener('pointerup', () => el.classList.remove('pressing'));
  el.addEventListener('pointercancel', () => el.classList.remove('pressing'));
  el.addEventListener('click', () => {
    if (item.url) window.open(item.url, '_blank');
  });

  return el;
}

// ===== FOLDER ICON =====
function createFolderIcon(item, pageIndex) {
  const el = document.createElement('div');
  el.className = 'app-icon folder-icon';

  const wrap = document.createElement('div');
  wrap.className = 'icon-wrap';

  const preview = document.createElement('div');
  preview.className = 'folder-preview';

  (item.items || []).slice(0, 9).forEach(subItem => {
    const cell = document.createElement('div');
    cell.className = 'folder-preview-item';
    if (subItem.iconType === 'image' && subItem.iconUrl) {
      const img = document.createElement('img');
      img.src = subItem.iconUrl;
      cell.appendChild(img);
    } else {
      cell.textContent = subItem.icon || '🔗';
    }
    preview.appendChild(cell);
  });

  wrap.appendChild(preview);

  const label = document.createElement('div');
  label.className = 'icon-label';
  label.textContent = item.name;

  el.appendChild(wrap);
  el.appendChild(label);

  el.addEventListener('click', () => openFolder(item));

  return el;
}

// ===== FOLDER MODAL =====
function openFolder(folder) {
  state.folderOpen = folder;
  const modal = document.getElementById('folder-modal');
  const title = modal.querySelector('.modal-title');
  const grid = modal.querySelector('.folder-grid');

  title.textContent = folder.name;
  grid.innerHTML = '';

  (folder.items || []).forEach(item => {
    grid.appendChild(createAppIcon(item));
  });

  modal.classList.add('open');
}

function closeFolder() {
  document.getElementById('folder-modal').classList.remove('open');
  state.folderOpen = null;
}

// ===== PAGE NAVIGATION =====
function goToPage(index, animate = true) {
  const total = state.data.pages.length;
  index = Math.max(0, Math.min(total - 1, index));
  state.currentPage = index;

  const slider = document.getElementById('slider');
  if (!animate) slider.style.transition = 'none';
  slider.style.transform = `translateX(-${index * 100}vw)`;
  if (!animate) requestAnimationFrame(() => slider.style.transition = '');

  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('active', i === index);
  });
}

// ===== SWIPE =====
let swipeStartX = null, swipeStartY = null, isDragging = false;

function initSwipe() {
  const wrapper = document.getElementById('slider-wrapper');

  wrapper.addEventListener('touchstart', e => {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  wrapper.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - swipeStartX;
    const dy = e.touches[0].clientY - swipeStartY;
    if (Math.abs(dx) > Math.abs(dy)) e.preventDefault();
  }, { passive: false });

  wrapper.addEventListener('touchend', e => {
    if (!isDragging) return;
    isDragging = false;
    const dx = e.changedTouches[0].clientX - swipeStartX;
    if (Math.abs(dx) > 50) {
      dx < 0 ? goToPage(state.currentPage + 1) : goToPage(state.currentPage - 1);
    }
  });

  // Mouse drag
  let mouseDown = false, mouseX = 0;
  wrapper.addEventListener('mousedown', e => { mouseDown = true; mouseX = e.clientX; });
  wrapper.addEventListener('mousemove', e => {
    if (!mouseDown) return;
    const dx = e.clientX - mouseX;
    const slider = document.getElementById('slider');
    slider.style.transition = 'none';
    slider.style.transform = `translateX(calc(-${state.currentPage * 100}vw + ${dx}px))`;
  });
  window.addEventListener('mouseup', e => {
    if (!mouseDown) return;
    mouseDown = false;
    const dx = e.clientX - mouseX;
    const slider = document.getElementById('slider');
    slider.style.transition = '';
    if (Math.abs(dx) > 60) {
      dx < 0 ? goToPage(state.currentPage + 1) : goToPage(state.currentPage - 1);
    } else {
      goToPage(state.currentPage);
    }
  });
}

// ===== ADMIN =====
function openAdmin() {
  const panel = document.getElementById('admin-panel');
  renderAdmin();
  panel.classList.add('open');
}

function closeAdmin() {
  document.getElementById('admin-panel').classList.remove('open');
}

function renderAdmin() {
  const body = document.getElementById('admin-body');
  const s = state.data.settings;
  const pages = state.data.pages;

  body.innerHTML = `
    <!-- Site Title -->
    <div class="admin-section">
      <h3>網站標題</h3>
      <div class="form-group">
        <input type="text" id="admin-title" value="${escHtml(s.title || 'My Works')}" placeholder="My Works">
      </div>
    </div>

    <!-- Background -->
    <div class="admin-section">
      <h3>背景</h3>
      <div class="bg-options" id="bg-options">
        ${PRESETS.map((p, i) => `
          <div class="bg-swatch ${(s.background.value === p.value && s.background.type !== 'image') ? 'selected' : ''}"
               style="background:${p.value}"
               data-gradient="${escAttr(p.value)}"
               title="${p.label}"></div>
        `).join('')}
      </div>
      <div class="form-group">
        <label>或上傳自訂壁紙</label>
        <input type="file" id="bg-upload" accept="image/*" style="color:rgba(255,255,255,0.7)">
      </div>
    </div>

    <!-- Theme -->
    <div class="admin-section">
      <h3>外觀主題</h3>
      <div class="form-group">
        <select id="theme-select">
          <option value="system" ${(localStorage.getItem('themeOverride')||'system')==='system'?'selected':''}>跟隨系統</option>
          <option value="dark" ${localStorage.getItem('themeOverride')==='dark'?'selected':''}>強制深色</option>
          <option value="light" ${localStorage.getItem('themeOverride')==='light'?'selected':''}>強制淡色</option>
        </select>
      </div>
    </div>

    <!-- Password -->
    <div class="admin-section">
      <h3>Admin 密碼</h3>
      <div class="toggle-row">
        <label>啟用密碼保護</label>
        <label class="toggle">
          <input type="checkbox" id="pw-enabled" ${s.passwordEnabled ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="form-group" style="margin-top:12px">
        <label>密碼</label>
        <input type="password" id="pw-value" value="${escHtml(s.password || '')}" placeholder="留空 = 不設密碼">
      </div>
    </div>

    <!-- Pages & Apps -->
    <div class="admin-section">
      <h3>頁面與作品</h3>
      <div id="admin-pages-list">
        ${pages.map((page, pi) => renderAdminPage(page, pi)).join('')}
      </div>
      <button class="btn btn-ghost btn-sm" onclick="addPage()" style="margin-top:8px">+ 新增頁面</button>
    </div>

    <!-- Save -->
    <div style="display:flex;gap:12px;margin-top:8px;padding-bottom:40px">
      <button class="btn btn-primary" onclick="saveAdmin()" style="flex:1">儲存變更</button>
      <button class="btn btn-ghost" onclick="closeAdmin()">取消</button>
    </div>
  `;

  // BG swatches
  body.querySelectorAll('.bg-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      body.querySelectorAll('.bg-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      state.data.settings.background = { type: 'gradient', value: sw.dataset.gradient };
    });
  });

  // BG upload
  document.getElementById('bg-upload').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    fd.append('_adminPassword', state.adminPassword);
    try {
      const res = await fetch('api.php?action=upload-bg', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) {
        state.data.settings.background = { type: 'image', value: data.url };
        document.querySelectorAll('.bg-swatch').forEach(s => s.classList.remove('selected'));
        showToast('壁紙上傳成功');
      }
    } catch { showToast('上傳失敗', 'error'); }
  });
}

function renderAdminPage(page, pi) {
  return `
    <div class="admin-page-block" style="margin-bottom:16px;padding:12px 14px;background:rgba(255,255,255,0.04);border-radius:14px;border:1px solid rgba(255,255,255,0.06)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">頁面 ${pi + 1}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="addItem(${pi}, 'app')">+ App</button>
          <button class="btn btn-ghost btn-sm" onclick="addItem(${pi}, 'folder')">+ 資料夾</button>
          ${pi > 0 ? `<button class="btn btn-danger btn-sm" onclick="removePage(${pi})">刪除頁</button>` : ''}
        </div>
      </div>
      <div id="page-items-${pi}">
        ${page.items.map((item, ii) => renderAdminItem(item, pi, ii)).join('')}
        ${page.items.length === 0 ? '<p style="color:rgba(255,255,255,0.3);font-size:13px;text-align:center;padding:10px 0">空白頁面，點上方按鈕新增</p>' : ''}
      </div>
    </div>
  `;
}

function renderAdminItem(item, pi, ii) {
  const iconDisplay = item.iconType === 'image' && item.iconUrl
    ? `<img src="${escAttr(item.iconUrl)}" style="width:100%;height:100%;object-fit:cover">`
    : escHtml(item.icon || (item.type === 'folder' ? '📁' : '🔗'));

  return `
    <div class="app-list-item">
      <div class="item-icon">${iconDisplay}</div>
      <div class="item-info">
        <div class="item-name">${escHtml(item.name)}</div>
        <div class="item-url">${item.type === 'folder' ? `📁 ${(item.items || []).length} 個項目` : escHtml(item.url || '')}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-ghost btn-sm" onclick="editItem(${pi}, ${ii})">編輯</button>
        <button class="btn btn-danger btn-sm" onclick="deleteItem(${pi}, ${ii})">刪除</button>
      </div>
    </div>
  `;
}

// ===== ADD / EDIT ITEMS =====
function addItem(pageIndex, type) {
  showItemModal(null, pageIndex, -1, type);
}

function editItem(pageIndex, itemIndex) {
  const item = state.data.pages[pageIndex].items[itemIndex];
  showItemModal(item, pageIndex, itemIndex, item.type);
}

function deleteItem(pageIndex, itemIndex) {
  if (!confirm('確定刪除？')) return;
  state.data.pages[pageIndex].items.splice(itemIndex, 1);
  renderAdmin();
}

function addPage() {
  state.data.pages.push({ id: 'page-' + Date.now(), items: [] });
  renderAdmin();
}

function removePage(pi) {
  if (!confirm('確定刪除這個頁面？')) return;
  state.data.pages.splice(pi, 1);
  if (state.currentPage >= state.data.pages.length) state.currentPage = state.data.pages.length - 1;
  renderAdmin();
}

function showItemModal(item, pageIndex, itemIndex, type) {
  const isFolder = type === 'folder';
  const modal = document.getElementById('item-modal');
  const box = modal.querySelector('.modal-box');

  // For new app: show URL-first flow
  if (!item && !isFolder) {
    box.innerHTML = `
      <h2>新增 App</h2>
      <div class="form-group">
        <label>貼上網址</label>
        <div style="display:flex;gap:8px">
          <input type="url" id="item-url-input" placeholder="https://..." style="flex:1">
          <button class="btn btn-primary" id="fetch-btn" onclick="fetchMeta(${pageIndex})">抓取</button>
        </div>
        <div id="fetch-status" style="margin-top:6px;font-size:12px;color:rgba(255,255,255,0.4)">輸入網址後點「抓取」</div>
      </div>
      <div id="item-form" style="display:none">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding:12px;background:rgba(255,255,255,0.05);border-radius:12px">
          <div id="icon-preview" style="width:56px;height:56px;border-radius:13px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:30px;overflow:hidden;flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div id="preview-name" style="color:#fff;font-weight:600;font-size:15px"></div>
            <div id="preview-url" style="color:rgba(255,255,255,0.4);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>
          </div>
        </div>
        <div class="form-group">
          <label>名稱</label>
          <input type="text" id="item-name" placeholder="My App">
        </div>
        <div class="form-group">
          <label>圖示 Emoji（可自訂，留空用網站 favicon）</label>
          <input type="text" id="item-icon" placeholder="🚀" maxlength="2">
        </div>
        <input type="hidden" id="item-favicon" value="">
        <input type="hidden" id="item-color" value="">
        <div class="form-group">
          <label>Icon 背景色</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
            ${COLORS.map(c => `
              <div onclick="selectColor(this,'${c}')"
                   class="${c}"
                   style="width:32px;height:32px;border-radius:8px;cursor:pointer;border:2px solid transparent;transition:border-color 0.2s">
              </div>
            `).join('')}
            <div onclick="selectColor(this,'')"
                 style="width:32px;height:32px;border-radius:8px;cursor:pointer;background:rgba(255,255,255,0.1);border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px">
              無
            </div>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:4px">
          <button class="btn btn-primary" onclick="saveItem(${pageIndex},${itemIndex},'app')" style="flex:1">新增</button>
          <button class="btn btn-ghost" onclick="closeItemModal()">取消</button>
        </div>
      </div>
      <div id="item-form-cancel" style="margin-top:12px;display:flex;justify-content:center">
        <button class="btn btn-ghost btn-sm" onclick="closeItemModal()">取消</button>
      </div>
    `;
    modal.classList.add('open');

    // Auto-fetch on Enter
    document.getElementById('item-url-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') fetchMeta(pageIndex);
    });
    return;
  }

  // Edit existing item or folder
  box.innerHTML = `
    <h2>${item ? '編輯' : '新增'} ${isFolder ? '資料夾' : 'App'}</h2>

    <div class="form-group">
      <label>名稱</label>
      <input type="text" id="item-name" value="${escHtml(item?.name || '')}" placeholder="${isFolder ? '工具箱' : 'My App'}">
    </div>

    ${!isFolder ? `
    <div class="form-group">
      <label>連結 URL</label>
      <input type="url" id="item-url-input" value="${escHtml(item?.url || '')}" placeholder="https://...">
    </div>
    ` : ''}

    <div class="form-group">
      <label>圖示 (Emoji)</label>
      <input type="text" id="item-icon" value="${escHtml(item?.icon || (isFolder ? '📁' : '🔗'))}" placeholder="🚀" maxlength="2">
    </div>
    <input type="hidden" id="item-favicon" value="${escHtml(item?.iconUrl || '')}">

    ${!isFolder ? `
    <div class="form-group">
      <label>Icon 背景色</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
        ${COLORS.map(c => `
          <div onclick="selectColor(this,'${c}')"
               class="${c} ${(item?.color === c) ? 'selected' : ''}"
               style="width:32px;height:32px;border-radius:8px;cursor:pointer;border:2px solid ${(item?.color === c) ? '#fff' : 'transparent'};transition:border-color 0.2s">
          </div>
        `).join('')}
        <div onclick="selectColor(this,'')"
             style="width:32px;height:32px;border-radius:8px;cursor:pointer;background:rgba(255,255,255,0.1);border:2px solid ${(!item?.color) ? '#fff' : 'transparent'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px">
          無
        </div>
      </div>
      <input type="hidden" id="item-color" value="${escHtml(item?.color || '')}">
    </div>
    ` : ''}

    ${isFolder && item ? `
    <div style="margin-bottom:16px">
      <label style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:8px">資料夾內容 (${(item.items||[]).length} 個)</label>
      ${(item.items || []).map((si, sii) => `
        <div class="app-list-item" style="margin-bottom:6px">
          <div class="item-icon">${si.icon || '🔗'}</div>
          <div class="item-info"><div class="item-name">${escHtml(si.name)}</div><div class="item-url">${escHtml(si.url||'')}</div></div>
          <button class="btn btn-danger btn-sm" onclick="deleteFolderItem(${pageIndex},${itemIndex},${sii})">刪</button>
        </div>
      `).join('')}
      <button class="btn btn-ghost btn-sm" onclick="addFolderItem(${pageIndex},${itemIndex})" style="margin-top:6px">+ 新增連結</button>
    </div>
    ` : ''}

    <div style="display:flex;gap:10px">
      <button class="btn btn-primary" onclick="saveItem(${pageIndex},${itemIndex},'${type}')" style="flex:1">
        ${item ? '儲存' : '新增'}
      </button>
      <button class="btn btn-ghost" onclick="closeItemModal()">取消</button>
    </div>
  `;

  modal.classList.add('open');
}

// ===== FETCH META =====
async function fetchMeta(pageIndex) {
  const urlInput = document.getElementById('item-url-input');
  const status = document.getElementById('fetch-status');
  const btn = document.getElementById('fetch-btn');
  let url = urlInput.value.trim();
  if (!url) { status.textContent = '請先輸入網址'; return; }
  if (!url.startsWith('http')) url = 'https://' + url;
  urlInput.value = url;

  btn.textContent = '抓取中...';
  btn.disabled = true;
  status.textContent = '正在抓取網站資訊...';
  status.style.color = 'rgba(255,255,255,0.4)';

  try {
    const res = await fetch('api.php?action=fetch-meta&url=' + encodeURIComponent(url));
    const meta = await res.json();

    // Show form
    document.getElementById('item-form').style.display = 'block';
    document.getElementById('item-form-cancel').style.display = 'none';

    // Fill in name
    const nameInput = document.getElementById('item-name');
    nameInput.value = meta.title || '';

    // Preview
    document.getElementById('preview-name').textContent = meta.title || url;
    document.getElementById('preview-url').textContent = url;

    // Icon preview
    const iconPreview = document.getElementById('icon-preview');
    const faviconInput = document.getElementById('item-favicon');
    if (meta.favicon) {
      faviconInput.value = meta.favicon;
      const img = document.createElement('img');
      img.src = meta.favicon;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:13px';
      img.onerror = () => { iconPreview.textContent = '🔗'; faviconInput.value = ''; };
      iconPreview.innerHTML = '';
      iconPreview.appendChild(img);
    } else {
      iconPreview.textContent = '🔗';
    }

    // Update icon preview on emoji input
    document.getElementById('item-icon').addEventListener('input', e => {
      if (e.target.value.trim()) {
        iconPreview.textContent = e.target.value.trim();
        faviconInput.value = '';
      } else if (meta.favicon) {
        faviconInput.value = meta.favicon;
        const img = document.createElement('img');
        img.src = meta.favicon;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:13px';
        img.onerror = () => { iconPreview.textContent = '🔗'; };
        iconPreview.innerHTML = '';
        iconPreview.appendChild(img);
      }
    });

    status.textContent = '✓ 抓取成功，可以調整名稱後新增';
    status.style.color = '#30d158';
  } catch (e) {
    status.textContent = '抓取失敗，請手動填寫';
    status.style.color = '#ff3b30';
    document.getElementById('item-form').style.display = 'block';
    document.getElementById('item-form-cancel').style.display = 'none';
  }

  btn.textContent = '重新抓取';
  btn.disabled = false;
}

let selectedColor = '';
function selectColor(el, color) {
  selectedColor = color;
  document.getElementById('item-color').value = color;
  el.closest('.form-group').querySelectorAll('div[onclick]').forEach(d => d.style.borderColor = 'transparent');
  el.style.borderColor = '#fff';
}

function saveItem(pageIndex, itemIndex, type) {
  const name = document.getElementById('item-name').value.trim();
  const urlEl = document.getElementById('item-url-input');
  const url = type === 'app' ? (urlEl?.value.trim() || '') : '';
  const icon = document.getElementById('item-icon')?.value.trim() || '';
  const color = document.getElementById('item-color')?.value || '';
  const favicon = document.getElementById('item-favicon')?.value || '';

  if (!name) { showToast('請填寫名稱', 'error'); return; }

  const existingItem = itemIndex >= 0 ? state.data.pages[pageIndex].items[itemIndex] : null;

  // Determine icon type
  let iconType = 'emoji';
  let iconUrl = '';
  if (!icon && favicon) {
    iconType = 'image';
    iconUrl = favicon;
  }

  const newItem = {
    id: existingItem?.id || 'item-' + Date.now(),
    type,
    name,
    icon: icon || (type === 'folder' ? '📁' : '🔗'),
    iconType,
    iconUrl,
    ...(type === 'app' ? { url, color } : {}),
    ...(type === 'folder' ? { items: existingItem?.items || [] } : {}),
  };

  if (itemIndex >= 0) {
    state.data.pages[pageIndex].items[itemIndex] = newItem;
  } else {
    state.data.pages[pageIndex].items.push(newItem);
  }

  closeItemModal();
  renderAdmin();
}

function closeItemModal() {
  document.getElementById('item-modal').classList.remove('open');
}

// Folder sub-items
function addFolderItem(pageIndex, folderIndex) {
  const dlg = document.createElement('dialog');
  dlg.style.cssText = 'background:#1c1c2e;border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:24px;width:min(360px,90vw);color:#fff';
  dlg.innerHTML = `
    <h2 style="font-size:18px;font-weight:700;margin-bottom:18px">新增連結</h2>
    <form method="dialog">
      <div style="margin-bottom:12px">
        <label style="display:block;color:rgba(255,255,255,0.55);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px">名稱</label>
        <input name="title" placeholder="我的連結" required
          style="width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:10px 13px;color:#fff;font-size:15px;outline:none">
      </div>
      <div style="margin-bottom:12px">
        <label style="display:block;color:rgba(255,255,255,0.55);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px">URL</label>
        <input name="url" type="url" placeholder="https://..." required
          style="width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:10px 13px;color:#fff;font-size:15px;outline:none">
      </div>
      <div style="margin-bottom:20px">
        <label style="display:block;color:rgba(255,255,255,0.55);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px">Emoji 圖示（可留空）</label>
        <input name="emoji" placeholder="🔗" maxlength="2"
          style="width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:10px 13px;color:#fff;font-size:15px;outline:none">
      </div>
      <div style="display:flex;gap:10px">
        <button type="submit" style="flex:1;background:#5e5ce6;color:#fff;border:none;border-radius:12px;padding:11px;font-size:14px;font-weight:600;cursor:pointer">加入</button>
        <button type="button" id="dlg-cancel" style="background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:11px 18px;font-size:14px;font-weight:600;cursor:pointer">取消</button>
      </div>
    </form>
  `;
  document.body.appendChild(dlg);
  dlg.showModal();

  dlg.querySelector('#dlg-cancel').addEventListener('click', () => { dlg.close(); dlg.remove(); });
  dlg.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(dlg.querySelector('form'));
    const folder = state.data.pages[pageIndex].items[folderIndex];
    folder.items = folder.items || [];
    folder.items.push({
      id: 'item-' + Date.now(),
      type: 'app',
      name: f.get('title'),
      url: f.get('url'),
      icon: f.get('emoji') || '🔗',
      iconType: 'emoji',
    });
    dlg.remove();
    showItemModal(folder, pageIndex, folderIndex, 'folder');
    saveData().catch(err => showToast(err.message || '儲存失敗', 'error'));
  });
}

function deleteFolderItem(pageIndex, folderIndex, subIndex) {
  if (!confirm('確定刪除？')) return;
  state.data.pages[pageIndex].items[folderIndex].items.splice(subIndex, 1);
  const folder = state.data.pages[pageIndex].items[folderIndex];
  showItemModal(folder, pageIndex, folderIndex, 'folder');
}

// ===== SAVE ADMIN =====
async function saveAdmin() {
  const s = state.data.settings;
  s.title = document.getElementById('admin-title').value.trim() || 'My Works';
  s.passwordEnabled = document.getElementById('pw-enabled').checked;
  s.password = document.getElementById('pw-value').value;

  // Theme
  const themeVal = document.getElementById('theme-select')?.value || 'system';
  if (themeVal === 'system') {
    localStorage.removeItem('themeOverride');
    document.documentElement.dataset.theme =
      window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } else {
    localStorage.setItem('themeOverride', themeVal);
    document.documentElement.dataset.theme = themeVal;
  }

  try {
    await saveData();
    applyBackground();
    renderPages();
    renderDots();
    closeAdmin();
    showToast('儲存成功！');
  } catch (e) {
    showToast(e.message || '儲存失敗', 'error');
  }
}

// ===== ADMIN PASSWORD GATE =====
function checkAdminPassword() {
  const s = state.data.settings;
  if (!s.passwordEnabled || !s.password) {
    openAdmin();
    return;
  }
  showPasswordScreen(() => openAdmin());
}

function showPasswordScreen(onSuccess) {
  const screen = document.getElementById('password-screen');
  const input = document.getElementById('pw-input');
  const err = document.getElementById('pw-error');
  input.value = '';
  err.textContent = '';
  screen.style.display = 'flex';
  input.focus();

  const submit = () => {
    if (input.value === state.data.settings.password) {
      state.adminPassword = input.value;
      screen.style.display = 'none';
      onSuccess();
    } else {
      err.textContent = '密碼錯誤，請再試';
      input.value = '';
      input.focus();
    }
  };

  document.getElementById('pw-submit').onclick = submit;
  input.onkeydown = e => { if (e.key === 'Enter') submit(); };
}

// ===== TOAST =====
function showToast(msg, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(30,30,50,0.95);color:#fff;padding:10px 20px;border-radius:20px;font-size:14px;font-weight:600;z-index:9999;transition:opacity 0.3s;pointer-events:none;border:1px solid rgba(255,255,255,0.15);backdrop-filter:blur(10px)';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.borderColor = type === 'error' ? 'rgba(255,59,48,0.5)' : 'rgba(255,255,255,0.15)';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.style.opacity = '0', 2500);
}

// ===== UTILS =====
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) { return escHtml(str); }

// ===== COPY LINK =====
async function copyLink() {
  const url = window.location.href.split('?')[0]; // 去掉 ?admin=1
  try {
    await navigator.clipboard.writeText(url);
    showToast('連結已複製');
  } catch (e) {
    // iOS fallback
    try {
      const el = document.createElement('textarea');
      el.value = url;
      el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
      document.body.appendChild(el);
      el.focus(); el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      showToast('連結已複製');
    } catch (e2) {
      showToast('複製失敗，請手動複製連結', 'error');
    }
  }
}

// ===== ADMIN GESTURE (Long-press statusbar 3s) =====
function initAdminGesture() {
  const statusbar = document.getElementById('statusbar');
  let pressTimer = null, pressStartPos = null;

  const cancelPress = () => {
    clearTimeout(pressTimer);
    pressStartPos = null;
  };

  statusbar.addEventListener('pointerdown', (e) => {
    pressStartPos = { x: e.clientX, y: e.clientY };
    pressTimer = setTimeout(() => {
      document.getElementById('admin-btn').style.display = '';
      showToast('管理員入口已解鎖 🔓');
    }, 3000);
  });

  statusbar.addEventListener('pointerup', cancelPress);
  statusbar.addEventListener('pointercancel', cancelPress);
  window.addEventListener('scroll', cancelPress, { passive: true });

  statusbar.addEventListener('pointermove', (e) => {
    if (!pressStartPos) return;
    if (Math.abs(e.clientX - pressStartPos.x) > 8 || Math.abs(e.clientY - pressStartPos.y) > 8) {
      cancelPress();
    }
  });
}

// ===== START =====
window.addEventListener('DOMContentLoaded', () => {
  // ?admin=1 → 直接顯示 Admin 按鈕
  if (new URLSearchParams(location.search).get('admin') === '1') {
    document.getElementById('admin-btn').style.display = '';
  }

  init().then(() => {
    initSwipe();
    initAdminGesture();
    document.getElementById('folder-modal').querySelector('.modal-backdrop')
      .addEventListener('click', closeFolder);
  });
});
