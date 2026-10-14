const $ = selector => document.querySelector(selector);
const grid = $('#auction-grid');
const authDialog = $('#auth-dialog');
const bidDialog = $('#bid-dialog');
let auctions = [];
let currentUser = null;
let selectedFilter = 'ALL';
let selectedAuction = null;
let favoriteIds = new Set();
let searchTerm = '';
let autoBidEnabled = false;

async function command(action, data = {}) {
  const apiBase = window.AUCTION_API_BASE || '';
  const endpoint = apiBase ? `${apiBase.replace(/\/$/, '')}/api/action` : new URL('api/action', document.baseURI).href;
  const result = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, data }) });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok && !apiBase) throw new Error('Giao diện đã tải. Để kết nối phiên đấu giá, hãy chạy backend theo web/README.md.');
  if (!result.ok) throw new Error(payload.error || 'Không thể kết nối máy chủ.');
  return payload.response || '';
}
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000); }
function money(amount) { return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(amount || 0)) + ' VNĐ'; }
function remaining(endTime) {
  const end = new Date(String(endTime || '').replace(' ', 'T'));
  const seconds = Math.floor((end - Date.now()) / 1000);
  if (!Number.isFinite(seconds)) return '---';
  if (seconds < 0) return 'Đã kết thúc';
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function dateOnly(endTime) { const match = String(endTime || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return match ? `${match[3]}/${match[2]}/${match[1]}` : '---'; }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function categoryName(type) { return ({ ART: 'Nghệ thuật', ELECTRONICS: 'Điện tử', VEHICLE: 'Phương tiện' })[String(type || '').toUpperCase()] || 'Khác'; }
function render() {
  const list = auctions.filter(a => {
    const type = String(a.itemType || '').toUpperCase();
    const categoryMatch = selectedFilter === 'ALL' || (selectedFilter === 'FAVORITES' ? favoriteIds.has(Number(a.auctionId)) : type.includes(selectedFilter));
    const searchMatch = !searchTerm || `${a.itemName} ${a.description || ''} ${a.itemType || ''}`.toLocaleLowerCase('vi').includes(searchTerm);
    return categoryMatch && searchMatch;
  });
  $('#empty').hidden = list.length !== 0;
  grid.innerHTML = list.map(a => {
    const id = Number(a.auctionId);
    const favorite = favoriteIds.has(id);
    const time = remaining(a.endTime);
    const bidLabel = currentUser ? 'Đấu giá' : 'Đăng kí đấu giá';
    return `<article class="auction-card" data-id="${id}">
      <div class="card-title-row"><h2>${esc(a.itemName || 'Sản phẩm đấu giá')}</h2><button class="favorite-button ${favorite ? 'selected' : ''}" data-favorite="${id}" aria-label="Yêu thích">${favorite ? '♥' : '♡'}</button></div>
      <div class="card-divider"></div>
      <div class="card-info">
        <span class="label">Giá khởi điểm:</span><span class="value">${money(a.startingPrice)}</span>
        <span class="label high-label">*Giá cao nhất hiện tại:</span><span class="value high-value">${money(a.currentHighestBid || a.startingPrice)}</span>
        <span class="label">Thời gian còn lại:</span><span class="value" data-end="${esc(a.endTime)}">${time}</span>
        <span class="label">Thầu thứ:</span><span class="value">${Number(a.bidCount || 0)}</span>
        <span class="label">Hạn đăng kí đến:</span><span class="value">${dateOnly(a.endTime)}</span>
      </div>
      <button class="bid-button" data-bid="${id}">${bidLabel}</button>
      <a class="detail-link" href="#auction-${id}" data-detail="${id}">Xem chi tiết &amp; Lịch sử</a>
    </article>`;
  }).join('');
  grid.querySelectorAll('[data-bid]').forEach(button => button.addEventListener('click', () => currentUser ? openAuction(button.dataset.bid) : openAuth(false)));
  grid.querySelectorAll('[data-detail]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); openAuction(link.dataset.detail); }));
  grid.querySelectorAll('[data-favorite]').forEach(button => button.addEventListener('click', () => toggleFavorite(button.dataset.favorite)));
}
async function loadAuctions() {
  $('#status').textContent = 'Đang tải phiên đấu giá...';
  try {
    const reply = await command('GET_AUCTIONS');
    if (!reply.startsWith('AUCTIONS===')) throw new Error(reply || 'Không tải được phiên đấu giá.');
    auctions = JSON.parse(reply.slice('AUCTIONS==='.length)).filter(a => ['OPEN', 'RUNNING'].includes(a.status));
    $('#status').textContent = `${auctions.length} phiên đấu giá`;
    $('#connection-dot').classList.add('online');
    render();
  } catch (error) { $('#status').textContent = error.message; $('#connection-dot').classList.remove('online'); }
}
function openAuth(register = false) {
  authDialog.dataset.mode = register ? 'register' : 'login';
  $('#auth-title').textContent = register ? 'Đăng Ký Người Dùng' : 'Đăng Nhập';
  $('#auth-submit').textContent = register ? 'Đăng Ký' : 'Đăng Nhập';
  $('#auth-eyebrow').textContent = register ? 'TINY HOARDER’S KEY MARKET' : 'TINY HOARDER’S KEY MARKET';
  $('#name-field').hidden = !register;
  $('#confirm-field').hidden = !register;
  $('#role-field').hidden = !register;
  $('#auth-cancel').textContent = 'Thoát';
  $('#auth-error').textContent = register ? '' : 'Xin mời nhập thông tin';
  $('#auth-switch').innerHTML = register ? 'Đã có tài khoản? <button type="button" data-mode="login">Đăng nhập</button>' : 'Chưa có tài khoản? <button type="button" data-mode="register">Đăng kí</button>';
  $('#auth-switch button').onclick = event => openAuth(event.currentTarget.dataset.mode === 'register');
  $('#auth-form').dataset.mode = register ? 'register' : 'login';
  authDialog.showModal();
}
function updateAccount(balance) {
  $('#account').innerHTML = currentUser
    ? `<div class="user-box"><button class="icon-button" id="user-notifications" aria-label="Thông báo">🔔<i></i></button><span class="user-pill">👤 <b>${esc(currentUser.username)}</b></span>${currentUser.role === 'BIDDER' ? `<button class="button wallet-button" data-dashboard="wallet">💰 Ví ${balance == null ? '' : money(balance)}</button>` : ''}<button class="button dashboard-button" data-dashboard="home">${currentUser.role === 'ADMIN' ? 'Quản trị' : currentUser.role === 'SELLER' ? 'Kênh người bán' : 'Tài khoản'}</button><button class="button logout-button" id="logout">Đăng xuất</button></div>`
    : `<div class="guest-box"><button class="button button-red" id="open-register">Đăng kí</button><button class="button button-outline" id="open-login">Đăng nhập</button><button class="icon-button" id="guest-notifications" aria-label="Thông báo">🔔<i></i></button></div>`;
  $('#open-login')?.addEventListener('click', () => openAuth(false));
  $('#open-register')?.addEventListener('click', () => openAuth(true));
  $('#guest-notifications,#user-notifications')?.addEventListener('click', () => toast(currentUser ? 'Bạn sẽ nhận thông báo khi có lượt trả giá mới.' : 'Đăng nhập để xem thông báo.'));
  $('#account [data-dashboard]')?.addEventListener('click', event => openDashboard(event.currentTarget.dataset.dashboard));
  $('#logout')?.addEventListener('click', async () => { try { await command('LOGOUT', ''); } catch {} currentUser = null; favoriteIds.clear(); updateAccount(); render(); toast('Đã đăng xuất.'); });
}
async function updateBalance() {
  if (currentUser?.role !== 'BIDDER') { updateAccount(); return; }
  try {
    const reply = await command('GET_BALANCE');
    const payload = JSON.parse(reply.split('===').slice(2).join('==='));
    updateAccount(payload.balance);
  } catch { updateAccount(); }
}
const dashDialog = $('#dashboard-dialog');
const dashPages = {
  SELLER: [['overview', 'Tổng quan'], ['auctions', 'Phiên của tôi'], ['unpaid', 'Chờ thanh toán'], ['paid', 'Đã thanh toán'], ['create', '＋ Đăng sản phẩm']],
  ADMIN: [['overview', 'Bảng điều khiển'], ['users', 'Người dùng'], ['auctions', 'Phiên đấu giá'], ['bids', 'Lịch sử đặt giá'], ['reports', 'Báo cáo vi phạm']],
  BIDDER: [['wallet', 'Ví của tôi']]
};
function openDashboard(page = 'overview') {
  if (!currentUser) return openAuth(false);
  const pages = dashPages[currentUser.role] || [];
  $('#dashboard-nav').innerHTML = `<div class="dash-nav-caption">${currentUser.role === 'ADMIN' ? 'QUẢN LÝ HỆ THỐNG' : currentUser.role === 'SELLER' ? 'KÊNH NGƯỜI BÁN' : 'TÀI KHOẢN'}</div>${pages.map(([key, title]) => `<button class="dash-nav-item ${key === page ? 'active' : ''}" data-page="${key}">${title}</button>`).join('')}`;
  $('#dashboard-brand').textContent = currentUser.role === 'ADMIN' ? 'QUẢN TRỊ ĐẤU GIÁ' : "TINY HOARDER'S KEY MARKET";
  dashDialog.showModal(); renderDashboardPage(page);
  $('#dashboard-nav').querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => {
    $('#dashboard-nav .active')?.classList.remove('active'); button.classList.add('active'); renderDashboardPage(button.dataset.page);
  }));
}
function dashTitle(title, subtitle = '') {
  $('#dashboard-heading').textContent = title;
  return `<div class="dash-page-title"><div><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div><span>${esc(currentUser.username)}</span></div>`;
}
function tableMarkup(headers, rows, empty = 'Không có dữ liệu') {
  if (!rows.length) return `<div class="dash-empty">${empty}</div>`;
  return `<div class="dash-table-wrap"><table class="dash-table"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
function splitJson(reply) {
  const marker = reply.indexOf('===');
  return marker < 0 ? null : JSON.parse(reply.slice(marker + 3));
}
async function renderDashboardPage(page) {
  const role = currentUser.role;
  let html = '';
  if (role === 'SELLER') html = await sellerDashboardPage(page);
  else if (role === 'ADMIN') html = await adminDashboardPage(page);
  else html = await walletDashboardPage();
  $('#dashboard-content').innerHTML = html;
  bindDashboardActions();
}
async function sellerAuctions() {
  const reply = await command('GET_AUCTIONS_BY_SELLER');
  return reply.startsWith('AUCTIONS===') ? JSON.parse(reply.slice(10)) : [];
}
async function sellerDashboardPage(page) {
  try {
    const list = await sellerAuctions();
    const paidReply = await command('GET_SELLER_PAID_AUCTIONS');
    const paidIds = new Set((paidReply.split('===')[1] ? JSON.parse(paidReply.split('===')[1]) : []).map(Number));
    const active = list.filter(a => ['OPEN', 'RUNNING'].includes(a.status));
    const unpaid = list.filter(a => a.status === 'FINISHED' && !paidIds.has(Number(a.auctionId)));
    const paid = list.filter(a => paidIds.has(Number(a.auctionId)));
    if (page === 'create') {
      $('#dashboard-heading').textContent = 'Đăng bán sản phẩm đấu giá';
      return `${dashTitle('Đăng bán sản phẩm đấu giá', 'Điền thông tin sản phẩm và thiết lập phiên đấu giá.')}
        <form class="dash-form" id="create-auction-form"><h3>Thông tin sản phẩm</h3><div class="dash-form-grid">
        <label>Tên sản phẩm *<input name="name" required placeholder="Tên sản phẩm"></label>
        <label>Danh mục *<select name="itemType"><option value="ART">Nghệ thuật</option><option value="VEHICLE">Phương tiện</option><option value="ELECTRONICS">Điện tử</option></select></label>
        <label>Giá khởi điểm (VNĐ) *<input name="startingPrice" type="number" min="1" required></label>
        <label>Bước giá (VNĐ) *<input name="stepPrice" type="number" min="1" value="10000" required></label>
        <label>Thời gian bắt đầu<input name="startTime" type="datetime-local"></label><label>Thời gian kết thúc<input name="endTime" type="datetime-local" required></label>
        <label class="wide">Ảnh sản phẩm (URL)<input name="imageUrl" type="url" placeholder="https://..."></label>
        <label class="wide">Mô tả chi tiết *<textarea name="description" rows="4" required maxlength="500"></textarea></label>
        <label>Nghệ sĩ / Tác giả<input name="artist"></label><label>Thương hiệu<input name="brand"></label>
        <label>Năm sản xuất<input name="year" type="number" min="0"></label><label>Bảo hành (tháng)<input name="warrantyMonths" type="number" min="0"></label>
        </div><p class="dash-feedback" id="create-feedback"></p><button class="button button-red">Tạo phiên đấu giá</button></form>`;
    }
    const filtered = page === 'unpaid' ? unpaid : page === 'paid' ? paid : page === 'overview' ? active : list;
    const title = page === 'unpaid' ? 'Đã chốt – Chưa thanh toán' : page === 'paid' ? 'Đã chốt – Đã thanh toán' : page === 'overview' ? 'Tổng quan phiên đấu giá' : 'Phiên đấu giá của tôi';
    const rows = filtered.map(a => `<tr><td>#${a.auctionId}</td><td>${esc(a.itemName)}</td><td>${money(a.currentHighestBid || a.startingPrice)}</td><td>${esc(a.currentWinnerUsername || '—')}</td><td><span class="status-tag">${esc(a.status)}</span></td><td>${page === 'unpaid' ? `<button class="table-action" data-mark-paid="${a.auctionId}">Xác nhận TT</button>` : esc(dateOnly(a.endTime))}</td></tr>`);
    return `${dashTitle(title, `${filtered.length} phiên`)}${page === 'overview' ? `<div class="dash-stats"><article><small>Đang diễn ra</small><b>${active.length}</b></article><article><small>Chờ thanh toán</small><b>${unpaid.length}</b></article><article><small>Đã thanh toán</small><b>${paid.length}</b></article></div>` : ''}<div class="dash-section-head"><h3>${esc(title)}</h3>${page !== 'unpaid' && page !== 'paid' ? '<button class="button button-red" data-open-create>＋ Đăng sản phẩm</button>' : ''}</div>${tableMarkup(['ID', 'Sản phẩm', 'Giá chốt / hiện tại', 'Người thắng', 'Trạng thái', 'Hạn / Hành động'], rows, 'Chưa có phiên đấu giá.')}`;
  } catch (error) { return `${dashTitle('Kênh người bán')}<div class="dash-empty">${esc(error.message)}</div>`; }
}
function adminActions(row, action, label) { return `<button class="table-action" data-admin-action="${action}" data-id="${esc(row.id ?? row.auctionId)}" data-name="${esc(row.username || '')}">${label}</button>`; }
async function adminDashboardPage(page) {
  try {
    if (page === 'overview') {
      const [statsReply, usersReply, auctionsReply] = await Promise.all([command('GET_ADMIN_STATS'), command('GET_USERS'), command('GET_ADMIN_AUCTIONS')]);
      const stats = splitJson(statsReply) || {}, users = splitJson(usersReply) || [], auctions = splitJson(auctionsReply) || [];
      return `${dashTitle('Bảng điều khiển', 'Tổng quan hoạt động hệ thống đấu giá.')}
        <div class="dash-stats admin-stats"><article><small>Tổng người dùng</small><b>${users.length}</b></article><article><small>Tổng phiên đấu giá</small><b>${auctions.length}</b></article><article><small>Tổng doanh thu</small><b>${money(stats.totalRevenue)}</b></article><article><small>Đang diễn ra</small><b class="red-text">${auctions.filter(a => a.status === 'RUNNING').length}</b></article><article><small>Đã thanh toán</small><b class="green-text">${stats.paidCount || 0}</b></article><article><small>Chờ thanh toán</small><b class="amber-text">${stats.unpaidCount || 0}</b></article></div>
        <div class="dash-section-head"><h3>Phiên đấu giá mới nhất</h3><button class="table-action" data-page-link="auctions">Xem tất cả</button></div>${tableMarkup(['ID', 'Sản phẩm', 'Người bán', 'Giá hiện tại', 'Trạng thái'], auctions.slice(0, 8).map(a => `<tr><td>#${a.auctionId}</td><td>${esc(a.itemName)}</td><td>${esc(a.sellerUsername)}</td><td>${money(a.currentHighestBid)}</td><td>${esc(a.status)}</td></tr>`))}`;
    }
    if (page === 'users') {
      const reply = await command('GET_USERS'), users = splitJson(reply) || [];
      return `${dashTitle('Quản lý người dùng', `${users.length} tài khoản`)}<div class="dash-section-head"><h3>Danh sách người dùng</h3><input class="table-search" id="user-search" placeholder="Tìm username..."></div><div id="user-table">${userTable(users)}</div>`;
    }
    if (page === 'auctions') {
      const auctions = splitJson(await command('GET_ADMIN_AUCTIONS')) || [];
      const rows = auctions.map(a => `<tr><td>#${a.auctionId}</td><td>${esc(a.itemName)}</td><td>${esc(a.sellerUsername)}</td><td>${money(a.currentHighestBid)}</td><td>${esc(a.currentWinnerUsername || '—')}</td><td>${esc(a.status)}</td><td>${['OPEN', 'RUNNING'].includes(a.status) ? adminActions(a, 'cancel', 'Hủy phiên') : '—'}</td></tr>`);
      return `${dashTitle('Quản lý phiên đấu giá', `${auctions.length} phiên`)}${tableMarkup(['ID', 'Sản phẩm', 'Seller', 'Giá hiện tại', 'Người thắng', 'Trạng thái', 'Hành động'], rows)}`;
    }
    if (page === 'bids') {
      const bids = splitJson(await command('GET_ADMIN_BIDS')) || [];
      return `${dashTitle('Lịch sử đặt giá', `${bids.length} lượt`)}${tableMarkup(['Mã GD', 'Phiên', 'Người đặt', 'Giá', 'Thời gian'], bids.map(b => `<tr><td>${b.transactionId}</td><td>#${b.auctionId}</td><td>${esc(b.bidderUsername)}</td><td>${money(b.bidAmount)}</td><td>${esc(b.timestamp)}</td></tr>`))}`;
    }
    if (page === 'reports') {
      const reports = splitJson(await command('GET_REPORTS')) || [];
      return `${dashTitle('Báo cáo vi phạm', `${reports.length} báo cáo`)}${tableMarkup(['Mã', 'Người báo cáo', 'Tài khoản bị báo cáo', 'Lý do', 'Ngày', 'Trạng thái', ''], reports.map(r => `<tr><td>#${r.id}</td><td>${esc(r.reporterUsername)}</td><td>${esc(r.targetUsername)}</td><td>${esc(r.reason)}</td><td>${esc(r.createdAt)}</td><td>${esc(r.status)}</td><td>${r.status === 'PENDING' ? adminActions(r, 'resolve', 'Đã xử lý') : '—'}</td></tr>`))}`;
    }
    return `${dashTitle('Bảng điều khiển')}<div class="dash-empty">Chọn một mục trong danh sách.</div>`;
  } catch (error) { return `${dashTitle('Bảng điều khiển')}<div class="dash-empty">${esc(error.message)}</div>`; }
}
function userTable(users) {
  return tableMarkup(['ID', 'Username', 'Vai trò', 'Trạng thái', 'Hành động'], users.map(u => `<tr><td>${esc(u.id)}</td><td>${esc(u.username)}</td><td>${esc(u.role)}</td><td>${esc(u.status || 'active')}</td><td>${adminActions({id: u.id, username: u.username}, u.status === 'banned' ? 'unban' : 'ban', u.status === 'banned' ? 'Mở khóa' : 'Khóa')}</td></tr>`));
}
async function walletDashboardPage() {
  try {
    const [balanceReply, historyReply] = await Promise.all([command('GET_BALANCE'), command('GET_TX_HISTORY', { limit: 50 })]);
    const balance = splitJson(balanceReply.split('===').slice(1).join('==='))?.balance ?? 0;
    const walletData = JSON.parse(historyReply.split('===').slice(2).join('==='));
    const transactions = walletData.transactions || [];
    return `${dashTitle('💰 Ví của tôi', 'Quản lý số dư và lịch sử giao dịch.')}
      <div class="wallet-balance"><small>Số dư khả dụng</small><strong>${money(balance)}</strong></div>
      <form class="deposit-form" id="deposit-form"><h3>📥 Nạp tiền</h3><div class="deposit-row"><input name="amount" type="number" min="1000" step="1000" placeholder="Số tiền (VNĐ)" required><input name="note" placeholder="Ghi chú giao dịch" value="Nạp tiền vào ví"><button class="button button-red">💳 Nạp tiền</button></div><div class="quick-amounts">${[100000, 500000, 1000000, 5000000, 10000000].map(n => `<button type="button" data-quick-amount="${n}">${n >= 1000000 ? `${n / 1000000} Triệu` : `${n / 1000}K`}</button>`).join('')}</div><p class="dash-feedback" id="deposit-feedback"></p></form>
      <div class="dash-section-head"><h3>📋 Lịch sử giao dịch</h3></div>${tableMarkup(['Thời gian', 'Loại', 'Số tiền', 'Trạng thái', 'Ghi chú'], transactions.map(t => `<tr><td>${esc(t.timestamp || t.createdAt || '')}</td><td>${esc(t.type || t.transactionType || '')}</td><td>${money(t.amount)}</td><td>${esc(t.status || '')}</td><td>${esc(t.note || t.description || '')}</td></tr>`), 'Chưa có giao dịch nào.')}`;
  } catch (error) { return `${dashTitle('Ví của tôi')}<div class="dash-empty">${esc(error.message)}</div>`; }
}
function bindDashboardActions() {
  $('#dashboard-content [data-open-create]')?.addEventListener('click', () => openDashboard('create'));
  $('#dashboard-content [data-page-link]')?.addEventListener('click', event => openDashboard(event.currentTarget.dataset.pageLink));
  $('#create-auction-form')?.addEventListener('submit', createAuctionFromWeb);
  $('#user-search')?.addEventListener('input', async event => {
    try { const users = splitJson(await command('GET_USERS')) || []; const term = event.target.value.toLocaleLowerCase('vi'); $('#user-table').innerHTML = userTable(users.filter(u => String(u.username).toLocaleLowerCase('vi').includes(term))); bindDashboardActions(); }
    catch {}
  });
  $('#dashboard-content [data-mark-paid]')?.addEventListener('click', async event => {
    const id = Number(event.currentTarget.dataset.markPaid);
    try { const reply = await command('MARK_AUCTION_PAID', { auctionId: id }); if (!reply.includes('===OK')) throw new Error(reply); toast('Đã cập nhật thanh toán.'); renderDashboardPage('unpaid'); }
    catch (error) { toast(error.message); }
  });
  $('#dashboard-content [data-admin-action]')?.forEach(button => button.addEventListener('click', async () => {
    const action = button.dataset.adminAction;
    try {
      let reply;
      if (action === 'cancel') reply = await command('CANCEL_AUCTION', { auctionId: Number(button.dataset.id) });
      else if (action === 'resolve') reply = await command('RESOLVE_REPORT', { reportId: button.dataset.id });
      else reply = await command(action === 'ban' ? 'BAN_USER' : 'UNBAN_USER', { username: button.dataset.name });
      if (!reply.includes('OK')) throw new Error(reply || 'Không cập nhật được.');
      toast('Đã cập nhật.'); renderDashboardPage(action === 'cancel' ? 'auctions' : action === 'resolve' ? 'reports' : 'users');
    } catch (error) { toast(error.message); }
  }));
  document.querySelectorAll('[data-quick-amount]').forEach(button => button.addEventListener('click', () => { $('#deposit-form [name="amount"]').value = button.dataset.quickAmount; }));
  $('#deposit-form')?.addEventListener('submit', depositFromWeb);
}
async function createAuctionFromWeb(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget), formatDate = value => value ? `${value.replace('T', ' ')}:00` : '';
  const startTime = formatDate(form.get('startTime')) || formatDate(new Date().toISOString().slice(0, 16));
  const endTime = formatDate(form.get('endTime'));
  const data = { name: form.get('name'), itemType: form.get('itemType'), startingPrice: Number(form.get('startingPrice')), stepPrice: Number(form.get('stepPrice')), startTime, endTime, imageUrl: form.get('imageUrl'), description: form.get('description'), artist: form.get('artist'), brand: form.get('brand'), year: Number(form.get('year') || 0), warrantyMonths: Number(form.get('warrantyMonths') || 0) };
  try {
    const reply = await command('CREATE_ITEM', data);
    if (!reply.startsWith('CREATE_ITEM_SUCCESS')) throw new Error(reply || 'Không tạo được phiên đấu giá.');
    toast('Đã tạo phiên đấu giá.'); openDashboard('auctions');
  } catch (error) { $('#create-feedback').textContent = error.message; }
}
async function depositFromWeb(event) {
  event.preventDefault(); const form = new FormData(event.currentTarget);
  try {
    const reply = await command('DEPOSIT', { amount: Number(form.get('amount')), note: form.get('note') });
    if (!reply.includes('OK===')) throw new Error(reply.split('===').slice(2).join('===') || 'Nạp tiền thất bại.');
    toast('Nạp tiền thành công.'); renderDashboardPage('wallet'); await updateBalance();
  } catch (error) { $('#deposit-feedback').textContent = error.message; }
}
async function loadFavorites() {
  try {
    const reply = await command('GET_FAVORITES');
    if (reply.startsWith('GET_FAVORITES===')) favoriteIds = new Set(JSON.parse(reply.slice('GET_FAVORITES==='.length)).map(Number));
  } catch { favoriteIds.clear(); }
}
async function toggleFavorite(id) {
  if (!currentUser) { openAuth(false); return; }
  const numericId = Number(id), wasFavorite = favoriteIds.has(numericId);
  try {
    const reply = await command(wasFavorite ? 'REMOVE_FAVORITE' : 'ADD_FAVORITE', { auctionId: numericId });
    if (reply.includes('FAIL')) throw new Error('Không thể cập nhật danh sách yêu thích.');
    wasFavorite ? favoriteIds.delete(numericId) : favoriteIds.add(numericId);
    render();
  } catch (error) { toast(error.message); }
}
$('#auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget), mode = event.currentTarget.dataset.mode;
  const data = { username: form.get('username'), password: form.get('password') };
  try {
    if (mode === 'register') {
      if (form.get('password') !== form.get('confirmPassword')) throw new Error('Mật khẩu xác thực không khớp.');
      const reply = await command('REGISTER', { ...data, role: form.get('role') });
      if (reply !== 'REGISTER SUCCESS') throw new Error('Tên đăng nhập đã tồn tại hoặc thông tin không hợp lệ.');
      $('#auth-error').textContent = 'Đăng ký thành công. Mời bạn đăng nhập.';
      setTimeout(() => openAuth(false), 900);
      return;
    }
    const reply = await command('LOGIN', data);
    if (!reply.startsWith('LOGIN SUCCESS===')) throw new Error(reply === 'LOGIN BANNED' ? 'Tài khoản đã bị khóa.' : 'Tên đăng nhập hoặc mật khẩu chưa đúng.');
    currentUser = { username: data.username, role: reply.split('===')[1] };
    await loadFavorites(); authDialog.close(); await updateBalance(); render(); toast('Đăng nhập thành công.');
  } catch (error) { $('#auth-error').textContent = error.message; }
});
$('#auth-cancel').addEventListener('click', () => authDialog.close());
$('#dashboard-close').addEventListener('click', () => dashDialog.close());
function openAuction(id) {
  selectedAuction = auctions.find(a => String(a.auctionId) === String(id));
  if (!selectedAuction) return;
  $('#bid-title').textContent = selectedAuction.itemName || 'Chi tiết phiên đấu giá';
  $('#bid-starting').textContent = money(selectedAuction.startingPrice);
  $('#bid-current').textContent = money(selectedAuction.currentHighestBid || selectedAuction.startingPrice);
  $('#bid-end').textContent = dateOnly(selectedAuction.endTime);
  $('#bid-countdown').textContent = remaining(selectedAuction.endTime);
  $('#bid-status').textContent = selectedAuction.status === 'RUNNING' ? '● Đang diễn ra' : '● Sắp diễn ra';
  $('#bid-form [name="amount"]').min = Number(selectedAuction.currentHighestBid || selectedAuction.startingPrice) + Number(selectedAuction.stepPrice || 1);
  $('#bid-form [name="amount"]').value = Number(selectedAuction.currentHighestBid || selectedAuction.startingPrice) + Number(selectedAuction.stepPrice || 1);
  $('#bid-error').textContent = '';
  $('#bid-history').innerHTML = 'Đang tải lịch sử...';
  autoBidEnabled = false; $('#auto-toggle').textContent = '🤖 Bật tự động';
  bidDialog.showModal();
  loadBidHistory(selectedAuction.auctionId);
  if (currentUser) loadAutoBid(selectedAuction.auctionId);
}
async function loadBidHistory(auctionId) {
  try {
    const reply = await command('GET_BID_HISTORY', { auctionId });
    const rows = JSON.parse(reply.slice(reply.indexOf('===') + 3));
    $('#bid-history').innerHTML = rows.length ? rows.map(row => `<div class="history-row"><span>${esc(row.time)} · ${esc(row.bidder)}</span><b>${money(row.amount)}</b></div>`).join('') : 'Chưa có lịch sử đấu giá.';
  } catch { $('#bid-history').textContent = 'Không tải được lịch sử đấu giá.'; }
}
async function loadAutoBid(auctionId) {
  try {
    const reply = await command('GET_AUTO_BID', { auctionId });
    const data = JSON.parse(reply.slice(reply.indexOf('===') + 3));
    autoBidEnabled = Boolean(data && Object.keys(data).length);
    $('#auto-toggle').textContent = autoBidEnabled ? 'Hủy đấu giá tự động' : '🤖 Bật tự động';
    if (autoBidEnabled) { $('#auto-max').value = data.maxBid || ''; $('#auto-step').value = data.increment || ''; }
  } catch { autoBidEnabled = false; }
}
$('#bid-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!currentUser) { bidDialog.close(); openAuth(false); return; }
  try {
    const amount = Number(new FormData(event.currentTarget).get('amount'));
    const reply = await command('PLACE_BID', { auctionId: selectedAuction.auctionId, username: currentUser.username, amount });
    if (reply !== 'BID SUCCESS') throw new Error(reply.replace(/^BID_FAIL===/, '') || 'Đặt giá không thành công.');
    $('#bid-error').textContent = 'Đặt giá thành công.'; await loadAuctions(); await loadBidHistory(selectedAuction.auctionId); await updateBalance();
  } catch (error) { $('#bid-error').textContent = error.message; }
});
$('#auto-toggle').addEventListener('click', async () => {
  if (!currentUser) { bidDialog.close(); openAuth(false); return; }
  try {
    const reply = autoBidEnabled
      ? await command('CANCEL_AUTO_BID', { auctionId: selectedAuction.auctionId })
      : await command('REGISTER_AUTO_BID', { auctionId: selectedAuction.auctionId, maxBid: Number($('#auto-max').value), increment: Number($('#auto-step').value), minutesTrigger: Number($('#auto-minutes').value || 5) });
    if (reply.includes('FAIL')) throw new Error(reply.split('===').slice(2).join(' ') || 'Không cập nhật được tự động đấu giá.');
    autoBidEnabled = !autoBidEnabled; $('#auto-toggle').textContent = autoBidEnabled ? 'Hủy đấu giá tự động' : '🤖 Bật tự động'; toast(autoBidEnabled ? 'Đã bật đấu giá tự động.' : 'Đã hủy đấu giá tự động.');
  } catch (error) { toast(error.message); }
});
document.querySelectorAll('.nav-filter').forEach(button => button.addEventListener('click', () => {
  $('.nav-filter.active')?.classList.remove('active'); button.classList.add('active'); selectedFilter = button.dataset.filter; render();
}));
$('#search-form').addEventListener('submit', event => { event.preventDefault(); searchTerm = $('#search-input').value.trim().toLocaleLowerCase('vi'); render(); });
$('#search-input').addEventListener('input', () => { searchTerm = $('#search-input').value.trim().toLocaleLowerCase('vi'); render(); });
$('#open-login').addEventListener('click', () => openAuth(false));
$('#open-register').addEventListener('click', () => openAuth(true));
$('#guest-notifications').addEventListener('click', () => toast('Đăng nhập để xem thông báo.'));
$('#refresh').addEventListener('click', loadAuctions);
updateAccount();
loadAuctions();
setInterval(loadAuctions, 30000);
setInterval(() => document.querySelectorAll('[data-end]').forEach(el => { el.textContent = remaining(el.dataset.end); }), 1000);
