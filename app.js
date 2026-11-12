import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const backendConfigured = /^https:\/\/.+\.supabase\.co$/.test(SUPABASE_URL) && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("COLE_");
const supabase = backendConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
const adminPage = Boolean(document.getElementById("admin-product-list"));
let adminSession = false;
let adminAuthCheck = 0;
const SHOP_WHATSAPP = '5511934744689'; // Número temporário do proprietário para testar a comanda.
const PRODUCTS_KEY = 'forte-aco-products-v1';
const CART_KEY = 'forte-aco-cart-v1';
const starterProducts = [
  { id: 'p1', name: 'Tubo metalon 40 × 40', category: 'Tubos', price: 86.9, unit: 'barra de 6 m', badge: 'MAIS PEDIDO', description: 'Perfil versátil para estruturas, portões e serralheria.', shape: 'square' },
  { id: 'p2', name: 'Viga I 4”', category: 'Perfis', price: 249.9, unit: 'barra de 6 m', badge: 'ESTRUTURA', description: 'Perfil estrutural para projetos que pedem resistência.', shape: 'beam' },
  { id: 'p3', name: 'Chapa galvanizada', category: 'Chapas', price: 189.5, unit: 'unidade · 1 × 2 m', badge: 'GALVANIZADA', description: 'Proteção e durabilidade para aplicações diversas.', shape: 'flat' },
  { id: 'p4', name: 'Vergalhão CA-50 10 mm', category: 'Vergalhões', price: 42.9, unit: 'barra de 12 m', badge: 'CA-50', description: 'Aço para concreto armado, com qualidade certificada.', shape: 'round' },
  { id: 'p5', name: 'Tubo redondo 1½”', category: 'Tubos', price: 73.5, unit: 'barra de 6 m', badge: 'ACABAMENTO', description: 'Tubo de aço para serralheria e estruturas leves.', shape: 'round' },
  { id: 'p6', name: 'Cantoneira 1½”', category: 'Perfis', price: 58.9, unit: 'barra de 6 m', badge: 'VERSÁTIL', description: 'Perfil angular para reforços e estruturas metálicas.', shape: 'angle' }
];
const readJson = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback
  } catch {
    return fallback
  }
};
let products = readJson(PRODUCTS_KEY, starterProducts);
let cart = readJson(CART_KEY, []);
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
async function saveProductToCloud(product) {
  if (!supabase || !adminSession) throw new Error("Entre como administrador para salvar produtos.");
  const { error } = await supabase.from("products").upsert({ ...product, sort_order: product.sort_order ?? Date.now(), updated_at: new Date().toISOString() });
  if (error) throw error;
}
async function removeProductFromCloud(id) {
  if (!supabase || !adminSession) throw new Error("Entre como administrador para remover produtos.");
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}
async function loadPublicProducts() {
  if (supabase) {
    const { data, error } = await supabase.from("products").select("id,name,category,price,unit,badge,description,image,shape").order("sort_order", { ascending: true });
    if (!error && data?.length) products = data;
    else if (error) console.error("Não foi possível carregar o catálogo online:", error.message);
  }
  renderCatalog();
  renderAdmin();
}
const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
let toastTimer;
function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600)
}

function renderCatalog() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  const active = document.querySelector('.filter.active')?.dataset.category || 'Todos';
  const query = (document.getElementById('search')?.value || '').trim().toLocaleLowerCase('pt-BR');
  const shown = products.filter(p => (active === 'Todos' || p.category === active) && `${p.name} ${p.category} ${p.description}`.toLocaleLowerCase('pt-BR').includes(query));
  const allFilter = document.querySelector('.filter[data-category="Todos"]');
  if (allFilter) allFilter.innerHTML = `Todos <span>${String(products.length).padStart(2, '0')}</span>`;
  grid.innerHTML = shown.map(p => `<article class="product-card"><div class="product-visual" data-view="${escapeHtml(p.id)}" role="button" tabindex="0" aria-label="Visualizar ${escapeHtml(p.name)} em 3D">${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1">` : `<span class="visual-steel ${escapeHtml(p.shape || 'beam')}"></span>`}<span class="product-badge">${escapeHtml(p.badge || p.category.toUpperCase())}</span><span class="visual-hint">↻ VER EM 3D</span></div><div class="product-copy"><div class="product-meta"><span>${escapeHtml(p.category.toUpperCase())}</span><span>● EM ESTOQUE*</span></div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description || 'Consulte detalhes com nossa equipe.')}</p><div class="product-purchase"><span class="product-price">${money(p.price)} <small>/ ${escapeHtml(p.unit)}</small></span><div class="product-actions"><button class="small-button" data-view="${escapeHtml(p.id)}" aria-label="Ver ${escapeHtml(p.name)} em 3D">↗</button><button class="small-button product-add-button" data-add="${escapeHtml(p.id)}" aria-label="Adicionar ${escapeHtml(p.name)} ao carrinho">Adicionar</button></div></div></div></article>`).join('') || '<p class="empty-state">Não encontramos materiais com essa busca. Tente outra palavra.</p>';
}
function renderAdmin() {
  const list = document.getElementById('admin-product-list');
  if (!list) return;
  document.getElementById('admin-product-count').textContent = products.length;
  list.innerHTML = products.map(p => `<div class="admin-product-row"><div class="admin-thumb">${p.image ? `<img src="${p.image}" alt="">` : '▱'}</div><div class="admin-product-name">${escapeHtml(p.name)}<small>${escapeHtml(p.category)}</small></div><div class="admin-product-price">${money(p.price)}<small>por ${escapeHtml(p.unit)}</small></div><div class="row-unit">${escapeHtml(p.badge || '')}</div><div class="row-actions"><button data-edit="${escapeHtml(p.id)}" aria-label="Editar ${escapeHtml(p.name)}">✎</button><button data-delete="${escapeHtml(p.id)}" aria-label="Excluir ${escapeHtml(p.name)}">×</button></div></div>`).join('') || '<p class="empty-state">Seu catálogo está vazio. Adicione o primeiro produto.</p>';
}
function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const countEl = document.getElementById('cart-count');
  if (countEl) countEl.textContent = count;
  const list = document.getElementById('cart-items');
  if (!list) return;
  list.innerHTML = cart.map(item => {
    const p = products.find(product => product.id === item.id);
    if (!p) return '';
    return `<div class="cart-row"><div class="cart-thumb">${p.image ? `<img src="${p.image}" alt="" style="width:100%;height:100%;object-fit:cover">` : '▱'}</div><div><h3>${escapeHtml(p.name)}</h3><p>${money(p.price)} / ${escapeHtml(p.unit)}</p><div class="qty-control"><button data-qty="${escapeHtml(p.id)}" data-change="-1" aria-label="Diminuir">−</button><span>${item.qty}</span><button data-qty="${escapeHtml(p.id)}" data-change="1" aria-label="Aumentar">+</button></div></div><strong>${money(p.price * item.qty)}</strong></div>`
  }).join('') || '<p class="empty-state">Sua sacola está vazia. Escolha alguns materiais para começar.</p>';
  const total = cart.reduce((sum, item) => sum + (products.find(p => p.id === item.id)?.price || 0) * item.qty, 0);
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = money(total);
}
function openCart() {
  document.getElementById('overlay')?.removeAttribute('hidden');
  document.getElementById('cart-drawer')?.classList.add('open');
  document.getElementById('cart-drawer')?.setAttribute('aria-hidden', 'false')
}
function closeCart() {
  document.getElementById('overlay')?.setAttribute('hidden', '');
  document.getElementById('cart-drawer')?.classList.remove('open');
  document.getElementById('cart-drawer')?.setAttribute('aria-hidden', 'true')
}
function addToCart(id) {
  const item = cart.find(x => x.id === id);
  if (item) item.qty++; else cart.push({ id, qty: 1 });
  saveCart();
  renderCart();
  toast('Material adicionado à sua sacola.')
}
function openCheckout() {
  if (!supabase) { toast('A finalização de pedidos será ativada após configurar o banco seguro da loja.'); return; }
  if (!cart.length) {
    toast('Adicione pelo menos um produto ao carrinho.');
    return
  }
  const modal = document.getElementById('checkout-modal');
  modal?.classList.add('open');
  modal?.setAttribute('aria-hidden', 'false');
  document.getElementById('checkout-form')?.elements.customerName.focus();
}
function closeCheckout() {
  const modal = document.getElementById('checkout-modal');
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true')
}
function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}
function validCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) return false;
  const digit = (base, factor) => {
    let sum = 0;
    for (const n of base) sum += Number(n) * factor--;
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder
  };
  return digit(cpf.slice(0, 9), 10) === Number(cpf[9]) && digit(cpf.slice(0, 10), 11) === Number(cpf[10]);
}
function formatCpf(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}
function formatPhone(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length < 3) return d ? `(${d}` : '';
  return d.length <= 10 ? d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2') : d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}
async function submitOrder(event) {
  event.preventDefault();
  if (!cart.length) { closeCheckout(); toast('Seu carrinho está vazio.'); return; }
  if (!supabase) { toast('A loja ainda não foi conectada ao banco seguro. A comanda não foi enviada.'); return; }
  const form = event.currentTarget, data = new FormData(form), name = String(data.get('customerName') || '').trim(), cpf = onlyDigits(data.get('cpf')), phone = onlyDigits(data.get('phone')), payment = String(data.get('payment') || '');
  if (!validCpf(cpf)) { form.elements.cpf.setCustomValidity('Confira o CPF informado.'); form.elements.cpf.reportValidity(); return; }
  form.elements.cpf.setCustomValidity('');
  if (phone.length < 10 || phone.length > 11) { form.elements.phone.setCustomValidity('Informe um telefone com DDD.'); form.elements.phone.reportValidity(); return; }
  form.elements.phone.setCustomValidity('');
  if (!form.elements.orderConsent.checked) { form.elements.orderConsent.reportValidity(); return; }
  if (!/^\d{10,15}$/.test(SHOP_WHATSAPP)) { toast('O número de WhatsApp do vendedor ainda precisa ser configurado.'); return; }
  const orderNumber = `FA-${Date.now().toString().slice(-8)}-${Math.floor(Math.random()*90+10)}`;
  const orderItems = cart.map(item => {
    const p = products.find(x => x.id === item.id);
    return p ? { product_id: p.id, name: p.name, unit: p.unit, price: Number(p.price), quantity: Number(item.qty), line_total: Number((p.price * item.qty).toFixed(2)) } : null;
  }).filter(Boolean);
  const total = orderItems.reduce((sum, item) => sum + item.line_total, 0);
  const lines = orderItems.map(item => `• ${item.quantity} × ${item.name} (${item.unit}) — ${money(item.line_total)}`);
  const message = [`*COMANDA FORTE AÇO — ${orderNumber}*`, ``, `*Cliente:* ${name}`, `*CPF:* ${formatCpf(cpf)}`, `*Telefone:* ${formatPhone(phone)}`, `*Pagamento escolhido:* ${payment}`, ``, `*Itens do pedido:*`, ...lines, ``, `*Subtotal estimado:* ${money(total)}`, `Frete, disponibilidade e pagamento serão confirmados diretamente com o vendedor.`].join('\n');
  const waWindow = window.open('about:blank', '_blank');
  if (!waWindow) { toast('Permita a abertura do WhatsApp para continuar.'); return; }
  const submit = form.querySelector('[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    const { error } = await supabase.from('orders').insert({ order_number: orderNumber, customer_name: name, cpf, phone, payment_method: payment, items: orderItems, subtotal: Number(total.toFixed(2)), status: 'Aguardando envio' });
    if (error) throw error;
    waWindow.location.href = `https://wa.me/${SHOP_WHATSAPP}?text=${encodeURIComponent(message)}`;
    closeCheckout(); closeCart();
    cart = []; saveCart(); renderCart();
    form.reset();
    toast('Comanda registrada. Confirme o envio na conversa do WhatsApp.');
  } catch (error) {
    waWindow.close();
    console.error('Falha ao registrar comanda:', error);
    toast('Não foi possível registrar a comanda. Tente novamente.');
  } finally { if (submit) submit.disabled = false; }
}
function openViewer(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('viewer-title').textContent = p.name;
  document.getElementById('viewer-modal').classList.add('open');
  document.getElementById('viewer-modal').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  resetViewer()
}
function closeViewer() {
  document.getElementById('viewer-modal')?.classList.remove('open');
  document.getElementById('viewer-modal')?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = ''
}
function resetViewer() {
  const obj = document.querySelector('.viewer-object');
  if (obj) obj.style.transform = 'rotateX(-18deg) rotateY(-31deg)'
}

function openEditor(product) {
  const modal = document.getElementById('editor-modal'), form = document.getElementById('product-form');
  if (!modal || !form) return;
  form.reset();
  form.elements.id.value = product?.id || '';
  form.elements.name.value = product?.name || '';
  form.elements.category.value = product?.category || 'Perfis';
  form.elements.price.value = product?.price ?? '';
  form.elements.unit.value = product?.unit || '';
  form.elements.badge.value = product?.badge || '';
  form.elements.description.value = product?.description || '';
  form.dataset.existingImage = product?.image || '';
  document.getElementById('editor-title').textContent = product ? 'Editar produto' : 'Novo produto';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  form.elements.name.focus()
}
function closeEditor() {
  const modal = document.getElementById('editor-modal');
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true')
}
function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (!file.type.startsWith('image/')) return reject(new Error('Escolha um arquivo de imagem.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler essa imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Não foi possível abrir essa imagem.'));
      img.onload = () => {
        const max = 900, scale = Math.min(1, max / Math.max(img.width, img.height)), canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', .78))
      };
      img.src = reader.result
    };
    reader.readAsDataURL(file)
  })
}
function renderOrders(orders) {
  const list = document.getElementById('orders-list');
  const count = document.getElementById('order-count');
  if (!list) return;
  if (count) count.textContent = String(orders.length);
  if (!orders.length) { list.innerHTML = '<p class="empty-state">Nenhuma comanda registrada.</p>'; return; }
  list.innerHTML = orders.map(order => {
    const date = new Date(order.created_at).toLocaleString('pt-BR');
    const items = (order.items || []).map(item => `<li>${Number(item.quantity)} × ${escapeHtml(item.name)} (${escapeHtml(item.unit)}) <strong>${money(item.line_total)}</strong></li>`).join('');
    return `<article class="order-card"><div class="order-card-head"><div><p class="eyebrow">${escapeHtml(order.order_number)} · ${escapeHtml(date)}</p><h3>${escapeHtml(order.customer_name)}</h3></div><label class="order-status-label">Status<select data-order-status="${escapeHtml(order.id)}"><option ${order.status==='Aguardando envio'?'selected':''}>Aguardando envio</option><option ${order.status==='Em atendimento'?'selected':''}>Em atendimento</option><option ${order.status==='Concluída'?'selected':''}>Concluída</option><option ${order.status==='Cancelada'?'selected':''}>Cancelada</option></select></label></div><div class="order-contact"><span><b>CPF</b> ${escapeHtml(formatCpf(order.cpf))}</span><span><b>Telefone</b> ${escapeHtml(formatPhone(order.phone))}</span><span><b>Pagamento</b> ${escapeHtml(order.payment_method)}</span></div><ul class="order-items">${items}</ul><div class="order-total"><span>Subtotal estimado</span><strong>${money(order.subtotal)}</strong></div></article>`;
  }).join('');
}
async function loadAdminOrders() {
  const list = document.getElementById('orders-list');
  if (!supabase || !adminSession || !list) return;
  list.innerHTML = '<p class="empty-state">Carregando comandas…</p>';
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) { list.innerHTML = '<p class="empty-state">Não foi possível carregar as comandas. Verifique as regras do banco.</p>'; console.error(error); return; }
  renderOrders(data || []);
}
async function setAdminAccess(user) {
  const checkId = ++adminAuthCheck;
  let authorized = false;
  if (user && supabase) {
    const { data, error } = await supabase.rpc('is_store_admin');
    authorized = !error && data === true;
  }
  if (checkId !== adminAuthCheck) return;
  const login = document.getElementById('login-section');
  const setup = document.getElementById('admin-setup-required');
  const panel = document.getElementById('admin-main');
  adminSession = authorized;
  if (setup) setup.hidden = Boolean(supabase);
  if (login) login.hidden = !supabase || authorized;
  if (panel) panel.hidden = !authorized;
  if (user && !authorized) {
    const error = document.getElementById('admin-login-error');
    if (error) error.textContent = 'Esta conta não está autorizada para administrar a loja.';
    supabase?.auth.signOut();
  }
  if (authorized) { loadAdminOrders(); loadPublicProducts(); }
}
function wireAdmin() {
  if (!adminPage) return;
  const loginForm = document.getElementById('admin-login-form');
  const loginError = document.getElementById('admin-login-error');
  if (!supabase) { setAdminAccess(null); return; }
  supabase.auth.getSession().then(({ data }) => setAdminAccess(data.session?.user || null));
  supabase.auth.onAuthStateChange((_event, session) => setAdminAccess(session?.user || null));
  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();
    if (loginError) loginError.textContent = '';
    const button = loginForm.querySelector('[type="submit"]');
    button.disabled = true;
    const { error } = await supabase.auth.signInWithPassword({ email: loginForm.elements.email.value.trim(), password: loginForm.elements.password.value });
    if (error && loginError) loginError.textContent = 'Não foi possível entrar. Confira a senha e tente novamente.';
    loginForm.elements.password.value = '';
    button.disabled = false;
  });
  document.getElementById('reset-admin-password')?.addEventListener('click', async () => {
    const email = loginForm?.elements.email.value.trim();
    if (!email) { toast('Informe o e-mail da conta administradora.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.href });
    toast(error ? 'Não foi possível enviar o link de redefinição.' : 'Enviamos um link de redefinição para o e-mail administrador.');
  });
  document.getElementById('admin-signout')?.addEventListener('click', async () => { await supabase.auth.signOut(); });
  document.getElementById('reload-orders')?.addEventListener('click', loadAdminOrders);
  document.getElementById('orders-list')?.addEventListener('change', async event => {
    const select = event.target.closest('[data-order-status]');
    if (!select || !adminSession) return;
    select.disabled = true;
    const { error } = await supabase.from('orders').update({ status: select.value }).eq('id', select.dataset.orderStatus);
    if (error) { toast('Não foi possível atualizar o status da comanda.'); await loadAdminOrders(); }
    else toast('Status da comanda atualizado.');
    select.disabled = false;
  });
  document.getElementById('add-product')?.addEventListener('click', () => openEditor());
  document.getElementById('editor-close')?.addEventListener('click', closeEditor);
  document.getElementById('cancel-editor')?.addEventListener('click', closeEditor);
  document.getElementById('editor-modal')?.addEventListener('click', e => { if (e.target.id === 'editor-modal') closeEditor(); });
  document.getElementById('admin-product-list')?.addEventListener('click', async e => {
    const edit = e.target.closest('[data-edit]'), del = e.target.closest('[data-delete]');
    if (edit) openEditor(products.find(x => x.id === edit.dataset.edit));
    if (del) {
      const product = products.find(x => x.id === del.dataset.delete);
      if (product && confirm(`Remover “${product.name}” do catálogo?`)) {
        try { await removeProductFromCloud(product.id); products = products.filter(x => x.id !== product.id); cart = cart.filter(x => x.id !== product.id); saveCart(); renderAdmin(); renderCatalog(); renderCart(); toast('Produto removido.'); }
        catch (error) { toast(error.message || 'Não foi possível remover o produto.'); }
      }
    }
  });
  document.getElementById('product-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget, submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const file = form.elements.image.files[0], image = file ? await compressImage(file) : form.dataset.existingImage || '';
      const product = { id: form.elements.id.value || `p-${Date.now()}`, name: form.elements.name.value.trim(), category: form.elements.category.value, price: Number(form.elements.price.value), unit: form.elements.unit.value.trim(), badge: form.elements.badge.value.trim() || form.elements.category.value.toUpperCase(), description: form.elements.description.value.trim(), image, shape: 'beam' };
      await saveProductToCloud(product);
      const index = products.findIndex(p => p.id === product.id);
      if (index >= 0) products[index] = product; else products.unshift(product);
      renderAdmin(); renderCatalog(); closeEditor(); toast(index >= 0 ? 'Alterações salvas.' : 'Produto adicionado ao catálogo.');
    } catch (err) { toast(err.message || 'Não foi possível salvar o produto.'); }
    finally { submit.disabled = false; }
  });
}
function wireStore() {
  document.getElementById('filters')?.addEventListener('click', e => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    document.querySelectorAll('.filter').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    renderCatalog()
  });
  document.getElementById('search')?.addEventListener('input', renderCatalog);
  document.getElementById('product-grid')?.addEventListener('click', e => {
    const add = e.target.closest('[data-add]'), view = e.target.closest('[data-view]');
    if (add) addToCart(add.dataset.add); else if (view) openViewer(view.dataset.view)
  });
  document.getElementById('product-grid')?.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.product-visual')) {
      e.preventDefault();
      openViewer(e.target.dataset.view)
    }
  });
  document.getElementById('open-cart')?.addEventListener('click', openCart);
  document.getElementById('close-cart')?.addEventListener('click', closeCart);
  document.getElementById('overlay')?.addEventListener('click', closeCart);
  document.getElementById('cart-items')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-qty]');
    if (!btn) return;
    const item = cart.find(x => x.id === btn.dataset.qty);
    if (!item) return;
    item.qty += Number(btn.dataset.change);
    if (item.qty <= 0) cart = cart.filter(x => x.id !== item.id);
    saveCart();
    renderCart()
  });
  document.getElementById('whatsapp-checkout')?.addEventListener('click', openCheckout);
  document.getElementById('checkout-form')?.addEventListener('submit', submitOrder);
  document.getElementById('checkout-close')?.addEventListener('click', closeCheckout);
  document.getElementById('checkout-cancel')?.addEventListener('click', closeCheckout);
  document.getElementById('checkout-modal')?.addEventListener('click', e => {
    if (e.target.id === 'checkout-modal') closeCheckout()
  });
  document.getElementById('checkout-form')?.elements.cpf.addEventListener('input', e => {
    e.currentTarget.value = formatCpf(e.currentTarget.value);
    e.currentTarget.setCustomValidity('')
  });
  document.getElementById('checkout-form')?.elements.phone.addEventListener('input', e => {
    e.currentTarget.value = formatPhone(e.currentTarget.value);
    e.currentTarget.setCustomValidity('')
  });
  document.querySelector('.whatsapp-link')?.addEventListener('click', e => {
    e.preventDefault();
    if (/^\d{10,15}$/.test(SHOP_WHATSAPP)) window.open(`https://wa.me/${SHOP_WHATSAPP}?text=${encodeURIComponent('Olá! Gostaria de pedir um orçamento para minha obra.')}`, '_blank', 'noopener'); else toast('O número de WhatsApp da loja será configurado na próxima etapa.')
  });
  document.getElementById('viewer-close')?.addEventListener('click', closeViewer);
  document.getElementById('viewer-modal')?.addEventListener('click', e => {
    if (e.target.id === 'viewer-modal') closeViewer()
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeCheckout();
      closeViewer();
      closeCart()
    }
  });
  const stage = document.getElementById('viewer-stage'), obj = document.querySelector('.viewer-object');
  let dragging = false, lastX = 0, lastY = 0, rotX = -18, rotY = -31;
  stage?.addEventListener('pointerdown', e => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    stage.setPointerCapture(e.pointerId)
  });
  stage?.addEventListener('pointermove', e => {
    if (!dragging || !obj) return;
    rotY += (e.clientX - lastX) * .7;
    rotX -= (e.clientY - lastY) * .55;
    lastX = e.clientX;
    lastY = e.clientY;
    obj.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`
  });
  stage?.addEventListener('pointerup', () => dragging = false);
  stage?.addEventListener('pointercancel', () => dragging = false);
  document.getElementById('menu-toggle')?.addEventListener('click', () => document.querySelector('.main-nav')?.classList.toggle('open'));
  document.querySelectorAll('.main-nav a').forEach(a => a.addEventListener('click', () => document.querySelector('.main-nav')?.classList.remove('open')));
}
renderCatalog(); renderAdmin(); renderCart(); wireStore(); wireAdmin(); loadPublicProducts();
const previewStatus = document.getElementById('preview-status');
if (previewStatus) previewStatus.hidden = Boolean(supabase);
