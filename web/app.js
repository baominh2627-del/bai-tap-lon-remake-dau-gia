const $ = selector => document.querySelector(selector);
const grid = $('#auction-grid');
const authDialog = $('#auth-dialog');
const bidDialog = $('#bid-dialog');
let auctions = [];
let currentUser = null;
let selectedFilter = 'ALL';
let selectedAuction = null;

async function command(action, data = {}) {
  const result = await fetch('/api/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, data }) });
  const payload = await result.json();
  if (!result.ok) throw new Error(payload.error || 'Không thể kết nối máy chủ.');
  return payload.response || '';
}
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000); }
function money(amount) { return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(amount || 0)) + ' ₫'; }
function remaining(endTime) {
  const end = new Date(String(endTime).replace(' ', 'T'));
  const seconds = Math.max(0, Math.floor((end - Date.now()) / 1000));
  if (!Number.isFinite(seconds)) return 'Đang cập nhật';
  if (!seconds) return 'Đã kết thúc';
  const days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600), mins = Math.floor(seconds % 3600 / 60);
  return days ? `Còn ${days} ngày` : `Còn ${hours} giờ ${mins} phút`;
}
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function render() {
  const list = auctions.filter(a => selectedFilter === 'ALL' || String(a.itemType).toUpperCase().includes(selectedFilter));
  $('#empty').hidden = list.length !== 0;
  grid.innerHTML = list.map((a, i) => {
    const image = a.imageUrl && !a.imageUrl.startsWith('http') ? `/${a.imageUrl.replace(/^\/+/, '')}` : a.imageUrl;
    const imageStyle = image ? `style="background-image:url('${esc(image)}')"` : '';
    const type = ({ ART: 'Nghệ thuật', ELECTRONICS: 'Điện tử', VEHICLE: 'Xe cộ' })[String(a.itemType).toUpperCase()] || esc(a.itemType || 'Sưu tầm');
    return `<article class="auction-card"><div class="card-image ${image ? 'has-image' : ''}" ${imageStyle}><span class="category">${type}</span>${!image ? `<span class="placeholder-shape shape-${i % 3}">${['✳', '◈', '◉'][i % 3]}</span>` : ''}<span class="time-left">◷ ${remaining(a.endTime)}</span></div><div class="card-body"><div class="card-meta">${esc(a.status || 'OPEN')} <span>${Number(a.bidCount || 0)} lượt trả giá</span></div><h3>${esc(a.itemName || 'Món đồ sưu tầm')}</h3><p class="description">${esc(a.description || `Món đồ ${type.toLowerCase()} đang chờ chủ nhân mới.`)}</p><div class="price-row"><div><small>GIÁ HIỆN TẠI</small><b>${money(a.currentHighestBid || a.startingPrice)}</b></div><button class="bid-button" data-id="${esc(a.auctionId)}" aria-label="Đặt giá">↗</button></div></div></article>`;
  }).join('');
  grid.querySelectorAll('.bid-button').forEach(button => button.addEventListener('click', () => openBid(button.dataset.id)));
}
async function loadAuctions() {
  $('#status').textContent = 'Đang đồng bộ phiên đấu giá...';
  try {
    const reply = await command('GET_AUCTIONS');
    if (!reply.startsWith('AUCTIONS===')) throw new Error(reply || 'Không tải được danh sách phiên.');
    auctions = JSON.parse(reply.slice('AUCTIONS==='.length));
    $('#status').textContent = `${auctions.length} phiên đấu giá được đồng bộ từ máy chủ`;
    $('#connection-dot').classList.add('online');
    render();
  } catch (error) { $('#status').textContent = error.message; $('#connection-dot').classList.remove('online'); }
}
function openAuth(register = false) {
  $('#auth-title').innerHTML = register ? 'Tạo tài khoản<br><em>của bạn.</em>' : 'Chào mừng<br><em>trở lại.</em>';
  $('#auth-eyebrow').textContent = register ? 'JOIN THE MARKET' : 'WELCOME BACK';
  $('#auth-submit').textContent = register ? 'Tạo tài khoản' : 'Đăng nhập';
  $('#role-field').hidden = !register;
  $('#auth-switch').innerHTML = register ? 'Đã có tài khoản? <button type="button" data-mode="login">Đăng nhập</button>' : 'Chưa có tài khoản? <button type="button" data-mode="register">Tạo tài khoản</button>';
  $('#auth-switch button').onclick = event => openAuth(event.currentTarget.dataset.mode === 'register');
  $('#auth-error').textContent = '';
  $('#auth-form').dataset.mode = register ? 'register' : 'login';
  authDialog.showModal();
}
function updateAccount() {
  $('#account').innerHTML = currentUser ? `<span class="signed-in">Xin chào, <b>${esc(currentUser.username)}</b></span><button class="btn btn-light" id="logout">Đăng xuất</button>` : '<button class="btn btn-light" id="open-login">Đăng nhập</button><button class="btn btn-primary" id="open-register">Tạo tài khoản</button>';
  $('#open-login')?.addEventListener('click', () => openAuth(false));
  $('#open-register')?.addEventListener('click', () => openAuth(true));
  $('#logout')?.addEventListener('click', async () => { try { await command('LOGOUT', ''); } catch {} currentUser = null; updateAccount(); toast('Bạn đã đăng xuất.'); });
}
$('#auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const mode = event.currentTarget.dataset.mode;
  const data = { username: form.get('username'), password: form.get('password') };
  try {
    if (mode === 'register') {
      const reply = await command('REGISTER', { ...data, role: form.get('role') });
      if (reply !== 'REGISTER SUCCESS') throw new Error('Tên đăng nhập đã tồn tại hoặc thông tin không hợp lệ.');
      $('#auth-error').textContent = 'Tài khoản đã tạo. Bạn có thể đăng nhập ngay.';
      return;
    }
    const reply = await command('LOGIN', data);
    if (!reply.startsWith('LOGIN SUCCESS===')) throw new Error(reply === 'LOGIN BANNED' ? 'Tài khoản đã bị khóa.' : 'Tên đăng nhập hoặc mật khẩu chưa đúng.');
    currentUser = { username: data.username, role: reply.split('===')[1] };
    authDialog.close(); updateAccount(); toast('Đăng nhập thành công.');
  } catch (error) { $('#auth-error').textContent = error.message; }
});
function openBid(id) {
  selectedAuction = auctions.find(a => String(a.auctionId) === String(id));
  if (!currentUser) { toast('Đăng nhập để tham gia đấu giá.'); openAuth(); return; }
  if (!selectedAuction) return;
  $('#bid-title').textContent = selectedAuction.itemName || 'Đặt giá';
  $('#bid-current').textContent = `Giá hiện tại: ${money(selectedAuction.currentHighestBid || selectedAuction.startingPrice)}`;
  $('#bid-form [name="amount"]').min = Number(selectedAuction.currentHighestBid || selectedAuction.startingPrice) + Number(selectedAuction.stepPrice || 1);
  $('#bid-form [name="amount"]').value = Number(selectedAuction.currentHighestBid || selectedAuction.startingPrice) + Number(selectedAuction.stepPrice || 1);
  $('#bid-error').textContent = ''; bidDialog.showModal();
}
$('#bid-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const amount = Number(new FormData(event.currentTarget).get('amount'));
    const reply = await command('PLACE_BID', { auctionId: selectedAuction.auctionId, username: currentUser.username, amount });
    if (!reply.includes('SUCCESS') && !reply.includes('BID_PLACED')) throw new Error(reply || 'Đặt giá không thành công.');
    bidDialog.close(); toast('Đã gửi mức giá. Đang cập nhật phiên...'); await loadAuctions();
  } catch (error) { $('#bid-error').textContent = error.message; }
});
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => { document.querySelector('.filter.active').classList.remove('active'); button.classList.add('active'); selectedFilter = button.dataset.filter; render(); }));
$('#open-login').addEventListener('click', () => openAuth(false));
$('#open-register').addEventListener('click', () => openAuth(true));
$('#refresh').addEventListener('click', loadAuctions);
loadAuctions();
setInterval(loadAuctions, 30000);
