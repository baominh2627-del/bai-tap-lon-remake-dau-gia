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
    ? `<div class="user-box"><button class="icon-button" id="user-notifications" aria-label="Thông báo">🔔<i></i></button><span class="user-pill">👤 <b>${esc(currentUser.username)}</b></span>${currentUser.role === 'BIDDER' ? `<span class="balance-pill">💰 Ví&nbsp; ${balance == null ? '...' : money(balance)}</span>` : ''}<button class="button logout-button" id="logout">Đăng xuất</button></div>`
    : `<div class="guest-box"><button class="button button-red" id="open-register">Đăng kí</button><button class="button button-outline" id="open-login">Đăng nhập</button><button class="icon-button" id="guest-notifications" aria-label="Thông báo">🔔<i></i></button></div>`;
  $('#open-login')?.addEventListener('click', () => openAuth(false));
  $('#open-register')?.addEventListener('click', () => openAuth(true));
  $('#guest-notifications,#user-notifications')?.addEventListener('click', () => toast(currentUser ? 'Bạn sẽ nhận thông báo khi có lượt trả giá mới.' : 'Đăng nhập để xem thông báo.'));
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
