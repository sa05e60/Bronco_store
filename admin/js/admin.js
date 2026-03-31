  // BRONCO Admin Panel — Node.js Backend API
  const API_BASE = (window.BRONCO_API_URL || '') + '/api';
  function escapeHtml(s) { return (s + '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[m]); }
  const loginView  = document.getElementById('login-view');
  const adminView  = document.getElementById('admin-view');
  const loginBtn   = document.getElementById('login-btn');
  const loginEmail = document.getElementById('login-email');
  const loginPass  = document.getElementById('login-pass');
  const loginMsg   = document.getElementById('login-msg');
  const logoutBtn  = document.getElementById('logout-btn');
  const adminEmail = document.getElementById('admin-email');
  const sidebar    = document.getElementById('sidebar');

  // Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabs = {
    'products-tab': document.getElementById('products-tab'),
    'coupons-tab': document.getElementById('coupons-tab'),
    'new-orders-tab': document.getElementById('new-orders-tab'),
    'shipped-orders-tab': document.getElementById('shipped-orders-tab'),
    'delivered-orders-tab': document.getElementById('delivered-orders-tab'),
    'returned-orders-tab': document.getElementById('returned-orders-tab')
  };
  tabButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const t = btn.dataset.tab;
      tabButtons.forEach(b=>b.classList.toggle('active', b===btn));
      Object.keys(tabs).forEach(k=>{ if(tabs[k]) tabs[k].style.display = (k===t)?'block':'none'; });
      
      if(t === 'products-tab') loadProducts();
      if(t === 'coupons-tab') loadCoupons();
      if(t === 'new-orders-tab' || t === 'shipped-orders-tab' || t === 'delivered-orders-tab' || t === 'returned-orders-tab') loadOrders();
    });
  });

  function checkAuthState() {
    let u = localStorage.getItem('bronco_admin');
    let parsed = null;
    if(u){
        try{ 
            parsed = JSON.parse(u); 
        }catch(e){ 
            localStorage.removeItem('bronco_admin'); 
            u = null; 
        }
    }

    if(u && parsed){
      loginView.style.display = 'none';
      adminView.style.display = 'block';
      if(sidebar) sidebar.style.display = 'flex';
      adminEmail.textContent = parsed.email || 'Admin';
      loadProducts();
      loadCoupons();
      loadOrders();
    }else{
      loginView.style.display = 'block';
      adminView.style.display = 'none';
      if(sidebar) sidebar.style.display = 'none';
      adminEmail.textContent = 'Not signed in';
    }
  }

  loginBtn.addEventListener('click', async ()=>{
    loginMsg.textContent = '';
    const email = loginEmail.value.trim();
    const pass  = loginPass.value;
    if(!email || !pass){
      loginMsg.textContent = 'اكتب الإيميل والباسورد.';
      return;
    }
    try{
      let r = await fetch(API_BASE + '?action=admin_login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, password:pass}) });
      let data = await r.json();
      if (data.success) {
          localStorage.setItem('bronco_admin', JSON.stringify({email: data.user.email, id: data.user.id, auth_token: data.user.auth_token}));
          checkAuthState();
      } else {
          loginMsg.textContent = 'فشل تسجيل الدخول: ' + data.message;
      }
    }catch(e){
      console.error(e);
      loginMsg.textContent = 'فشل الاتصال بالخادم.';
    }
  });

  logoutBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      localStorage.removeItem('bronco_admin');
      window.location.reload();
  });

  /* ========== PRODUCTS ========== */
  const prodId    = document.getElementById('prod-id');
  const prodTitle = document.getElementById('prod-title');
  const prodPrice = document.getElementById('prod-price');
  const prodImg   = document.getElementById('prod-img');
  const prodCat   = document.getElementById('prod-cat');
  const prodDesc  = document.getElementById('prod-desc');
  const prodSizes = document.getElementById('prod-sizes');
  const prodSpecs = document.getElementById('prod-specs');
  const prodStock = document.getElementById('prod-stock');
  const prodSave  = document.getElementById('prod-save');
  const prodClear = document.getElementById('prod-clear');
  const prodMsg   = document.getElementById('prod-msg');
  const productsList = document.getElementById('products-list');

  function slugify(str){
    return (str||'')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,'_')
      .replace(/^_+|_+$/g,'') || 'prod_'+Date.now();
  }

  function parseSpecs(str){
    const out = {};
    (str||'').split(';').forEach(part=>{
      const [k,v] = part.split('=');
      if(k && v) out[k.trim()] = v.trim();
    });
    return out;
  }

  function specsToString(obj){
    if(!obj) return '';
    return Object.entries(obj).map(([k,v])=>`${k}=${v}`).join('; ');
  }

  prodSave.addEventListener('click', async ()=>{
    prodMsg.textContent = '';
    const title = prodTitle.value.trim();
    const price = parseFloat(prodPrice.value || '0');
    if(!title || !price){
      prodMsg.textContent = 'العنوان والسعر ضروريين.';
      return;
    }
    let id = prodId.value.trim();
    if(!id) id = slugify(title);

    const sizesArr = (prodSizes.value || '')
      .split(',')
      .map(s=>s.trim())
      .filter(Boolean);

    const specsObj = parseSpecs(prodSpecs.value);

    const doc = {
      admin_id: JSON.parse(localStorage.getItem('bronco_admin'))?.id,
      auth_token: JSON.parse(localStorage.getItem('bronco_admin'))?.auth_token,
      id,
      title,
      priceCents: Math.round(price * 100),
      img: prodImg.value.trim() || '',
      category: prodCat.value || 'accessories',
      stock: parseInt(prodStock.value || '0', 10),
      details:{
        description: prodDesc.value.trim() || '',
        specs: specsObj,
        sizes: sizesArr,
        url: '#'
      },
      createdAt: new Date().toISOString()
    };

    try{
      let r = await fetch(API_BASE + '?action=admin_save_product', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(doc) });
      let data = await r.json();
      if(data.success){
          prodMsg.textContent = '✅ تم حفظ المنتج.';
          prodId.value = id;
          loadProducts();
      } else {
          prodMsg.textContent = 'Error: ' + (data.message || 'Unknown server error');
      }
    }catch(e){
      console.error(e);
      prodMsg.textContent = 'حدث خطأ أثناء الحفظ.';
    }
  });

  prodClear.addEventListener('click', ()=>{
    prodId.value = '';
    prodTitle.value = '';
    prodPrice.value = '';
    prodImg.value = '';
    prodDesc.value = '';
    prodSizes.value = '';
    prodSpecs.value = '';
    prodStock.value = '';
    prodMsg.textContent = '';
  });

  let currentProdPage = 1;

  function loadProducts(page = 1){
    currentProdPage = page;
    productsList.textContent = 'Loading products...';
    fetch(`${API_BASE}?action=get_products&page=${page}`)
      .then(r=>r.json())
      .then(data=>{
        if(!data.success || !data.products || data.products.length === 0){
          productsList.textContent = 'لا يوجد منتجات بعد.';
          return;
        }
        const rows = [];
        rows.push('<table><thead><tr><th>ID</th><th>Title</th><th>Cat</th><th>Price</th><th>Stock</th><th></th></tr></thead><tbody>');
        data.products.forEach(p=>{
          rows.push(`
            <tr>
              <td>${escapeHtml(p.id)}</td>
              <td>${escapeHtml(p.title || '')}</td>
              <td>${escapeHtml(p.category || '')}</td>
              <td>${(p.priceCents||0)/100}</td>
              <td>${p.stock || 0}</td>
              <td>
                <button class="icon-btn" data-edit="${escapeHtml(p.id)}">Edit</button>
                <button class="icon-btn danger" data-del="${escapeHtml(p.id)}" style="margin-left:4px;">Del</button>
              </td>
            </tr>
          `);
        });
        rows.push('</tbody></table>');
        
        // Pagination logic
        if(data.maxPages > 1) {
            rows.push('<div class="pagination-bar">');
            if(data.page > 1) rows.push(`<button class="page-btn prod-page" data-pg="${data.page-1}">السابق</button>`);
            rows.push(`<span class="page-info">صفحة ${data.page} من ${data.maxPages}</span>`);
            if(data.page < data.maxPages) rows.push(`<button class="page-btn prod-page" data-pg="${data.page+1}">التالي</button>`);
            rows.push('</div>');
        }

        productsList.innerHTML = rows.join('');

        productsList.querySelectorAll('.prod-page').forEach(btn => {
            btn.addEventListener('click', () => loadProducts(parseInt(btn.dataset.pg)));
        });

        productsList.querySelectorAll('button[data-edit]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const id = btn.dataset.edit;
            const p = data.products.find(x=>x.id===id);
            if(!p) return;
            prodId.value    = p.id;
            prodTitle.value = p.title || '';
            prodPrice.value = p.priceCents ? (p.priceCents/100).toFixed(2) : '';
            prodImg.value   = p.img || '';
            prodCat.value   = p.category || 'accessories';
            prodStock.value = p.stock || 0;
            prodDesc.value  = p.details?.description || '';
            prodSizes.value = (p.details?.sizes || []).join(', ');
            prodSpecs.value = specsToString(p.details?.specs || {});
            prodMsg.textContent = 'تم تحميل المنتج في الفورم للتعديل.';
            window.scrollTo({top:0,behavior:'smooth'});
          });
        });

        productsList.querySelectorAll('button[data-del]').forEach(btn=>{
          btn.addEventListener('click', async ()=>{
            const id = btn.dataset.del;
            const aid = JSON.parse(localStorage.getItem('bronco_admin'))?.id;
            const tok = JSON.parse(localStorage.getItem('bronco_admin'))?.auth_token;
            await fetch(API_BASE + '?action=admin_delete_product', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({admin_id:aid, auth_token:tok, id}) });
            loadProducts(currentProdPage);
          });
        });
      }).catch(err=>{
        console.error(err);
        productsList.textContent = 'خطأ في تحميل المنتجات.';
      });
  }

  /* ========== COUPONS ========== */
  const cpCode  = document.getElementById('cp-code');
  const cpType  = document.getElementById('cp-type');
  const cpValue = document.getElementById('cp-value');
  const cpMin   = document.getElementById('cp-min');
  const cpLabel = document.getElementById('cp-label');
  const cpSave  = document.getElementById('cp-save');
  const cpClear = document.getElementById('cp-clear');
  const cpMsg   = document.getElementById('cp-msg');
  const couponsList = document.getElementById('coupons-list');

  cpSave.addEventListener('click', async ()=>{
    cpMsg.textContent = '';
    let code = (cpCode.value || '').trim().toUpperCase();
    if(!code){
      cpMsg.textContent = 'الكود ضروري.';
      return;
    }
    const type = cpType.value;
    const value = parseInt(cpValue.value || '0', 10);
    const minUSD = parseFloat(cpMin.value || '0');
    const doc = {
      admin_id: JSON.parse(localStorage.getItem('bronco_admin'))?.id,
      auth_token: JSON.parse(localStorage.getItem('bronco_admin'))?.auth_token,
      code,
      type,
      value,
      label: cpLabel.value.trim() || '',
      minSubtotalCents: minUSD>0 ? Math.round(minUSD*100) : null,
      createdAt: new Date().toISOString()
    };
    try{
      let r = await fetch(API_BASE + '?action=admin_save_coupon', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(doc) });
      let data = await r.json();
      if(data.success){
          cpMsg.textContent = '✅ تم حفظ الكوبون.';
          loadCoupons();
      }else{ cpMsg.textContent = 'حدث خطأ أثناء حفظ الكوبون.'; }
    }catch(e){
      console.error(e);
      cpMsg.textContent = 'حدث خطأ أثناء حفظ الكوبون.';
    }
  });

  cpClear.addEventListener('click', ()=>{
    cpCode.value  = '';
    cpValue.value = '';
    cpMin.value   = '';
    cpLabel.value = '';
    cpMsg.textContent = '';
  });

  function loadCoupons(){
    couponsList.textContent = 'Loading coupons...';
    fetch(API_BASE + '?action=get_coupons')
      .then(r=>r.json())
      .then(data=>{
        if(!data.success || !data.coupons || data.coupons.length === 0){
          couponsList.textContent = 'ماكو كوبونات بعد.';
          return;
        }
        const rows = [];
        rows.push('<table><thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min</th><th>Label</th><th></th></tr></thead><tbody>');
        data.coupons.forEach(c=>{
          rows.push(`
            <tr>
              <td>${escapeHtml(c.code)}</td>
              <td>${escapeHtml(c.type)}</td>
              <td>${escapeHtml(c.type==='percent' ? (c.value+'%') : 'Free Ship')}</td>
              <td>${c.minSubtotalCents ? (c.minSubtotalCents/100) : '-'}</td>
              <td>${escapeHtml(c.label || '')}</td>
              <td>
                <button class="icon-btn" data-editcp="${escapeHtml(c.code)}">Edit</button>
                <button class="icon-btn danger" data-delcp="${escapeHtml(c.code)}" style="margin-left:4px;">Del</button>
              </td>
            </tr>
          `);
        });
        rows.push('</tbody></table>');
        couponsList.innerHTML = rows.join('');

        couponsList.querySelectorAll('button[data-editcp]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const id = btn.dataset.editcp;
            const c = data.coupons.find(x=>x.code===id);
            if(!c) return;
            cpCode.value  = c.code;
            cpType.value  = c.type || 'percent';
            cpValue.value = c.value || 0;
            cpMin.value   = c.minSubtotalCents ? (c.minSubtotalCents/100).toFixed(2) : '';
            cpLabel.value = c.label || '';
            cpMsg.textContent = 'تم تحميل الكوبون للتعديل.';
          });
        });

        couponsList.querySelectorAll('button[data-delcp]').forEach(btn=>{
          btn.addEventListener('click', async ()=>{
            const code = btn.dataset.delcp;
            const aid = JSON.parse(localStorage.getItem('bronco_admin'))?.id;
            const tok = JSON.parse(localStorage.getItem('bronco_admin'))?.auth_token;
            await fetch(API_BASE + '?action=admin_delete_coupon', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({admin_id:aid, auth_token:tok, code}) });
            loadCoupons();
          });
        });
      }).catch(err=>{
        console.error(err);
        couponsList.textContent = 'خطأ في تحميل الكوبونات.';
      });
  }

  /* ========== ORDERS ========== */
  let currentOrderPage = 1;

  function loadOrders(page = 1){
    currentOrderPage = page;
    const newOrdersList = document.getElementById('new-orders-list');
    const shippedOrdersList = document.getElementById('shipped-orders-list');
    const deliveredOrdersList = document.getElementById('delivered-orders-list');
    const returnedOrdersList = document.getElementById('returned-orders-list');

    newOrdersList.textContent = 'Loading orders...';
    shippedOrdersList.textContent = 'Loading...';
    deliveredOrdersList.textContent = 'Loading...';
    returnedOrdersList.textContent = 'Loading...';
    const aid = JSON.parse(localStorage.getItem('bronco_admin'))?.id;
    const tok = JSON.parse(localStorage.getItem('bronco_admin'))?.auth_token;
    fetch(`${API_BASE}?action=admin_get_orders&admin_id=${aid}&auth_token=${tok}&page=${page}`)
      .then(r=>r.json())
      .then(data=>{
        if(!data.success) {
          if (data.message === 'Unauthorized' || data.message === 'Unauthorized1' || data.message === 'Unauthorized2') {
             localStorage.removeItem('bronco_admin');
             window.location.reload();
             return;
          }
          newOrdersList.textContent = 'No orders available.';
          shippedOrdersList.textContent = 'No orders available.';
          deliveredOrdersList.textContent = 'No orders available.';
          returnedOrdersList.textContent = 'No orders available.';
          return;
        }

        if(!data.orders || data.orders.length === 0){
          newOrdersList.textContent = 'No orders available.';
          shippedOrdersList.textContent = 'No orders available.';
          deliveredOrdersList.textContent = 'No orders available.';
          returnedOrdersList.textContent = 'No orders available.';
          return;
        }
        
        const pending = data.orders.filter(o => o.status !== 'shipped' && o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'returned');
        const shipped = data.orders.filter(o => o.status === 'shipped');
        const delivered = data.orders.filter(o => o.status === 'delivered');
        const returned = data.orders.filter(o => o.status === 'cancelled' || o.status === 'returned');
        
        const generateTable = (ordersArray) => {
            if(ordersArray.length === 0) return '<div class="muted">No orders in this category.</div><br>';
            let html = '';
            html += '<table><thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
            ordersArray.forEach(o => {
              const totalUSD = o.totals ? (o.totals.total/100) : 0;
              const itemsStr = (o.items || []).map(it => `${escapeHtml(it.title)} x${it.qty}${it.size?(' ('+escapeHtml(it.size)+')'):''}`).join('<br>');
              const status = o.status || 'placed';
              
              let actionButtons = '';
              if(status === 'placed' || status === 'pending') {
                  actionButtons = `<button class="icon-btn" data-status="${escapeHtml(o.id)}" data-set="shipped">Mark Shipped</button><br>
                                   <button class="icon-btn danger" data-status="${escapeHtml(o.id)}" data-set="cancelled" style="margin-top:4px">Cancel</button>`;
              } else if (status === 'shipped') {
                  actionButtons = `<button class="icon-btn" data-status="${escapeHtml(o.id)}" data-set="delivered" style="background:#28a745; color:#fff;">Mark Delivered</button><br>
                                   <button class="icon-btn danger" data-status="${escapeHtml(o.id)}" data-set="returned" style="margin-top:4px">Mark Returned</button>`;
              } else if (status === 'delivered') {
                  actionButtons = `<span class="muted" style="color:green; font-weight:bold;">Completed</span><br>
                                   <button class="icon-btn danger" data-status="${escapeHtml(o.id)}" data-set="returned" style="margin-top:4px">Mark Returned</button>`;
              } else if (status === 'cancelled' || status === 'returned') {
                  actionButtons = `<span class="muted" style="color:red; font-weight:bold;">Cancelled/Returned</span><br>
                                   <button class="icon-btn danger" data-status="${escapeHtml(o.id)}" data-set="delete" style="margin-top:4px">Delete Order</button>`;
              }
              
              html += `
                <tr>
                  <td><span class="muted">${escapeHtml(o.id)}</span></td>
                  <td>
                    ${escapeHtml(o.customer?.name || '-')}<br>
                    <span class="muted">${escapeHtml(o.customer?.phone || '')}</span><br>
                    <span class="muted">${escapeHtml(o.customer?.city || '')}</span>
                  </td>
                  <td>${itemsStr}</td>
                  <td>$${totalUSD.toFixed(2)}</td>
                  <td><span class="status-pill status-${status}">${escapeHtml(status)}</span></td>
                  <td>${actionButtons}</td>
                </tr>
              `;
            });
            html += '</tbody></table><br>';
            return html;
        };
        
        const genPagination = () => {
             if(data.maxPages <= 1) return '';
             let html = '<div class="pagination-bar" style="margin-bottom:16px;">';
             if(data.page > 1) html += `<button class="page-btn ord-page" data-pg="${data.page-1}">الصفحة السابقة</button>`;
             html += `<span class="page-info">الصفحة ${data.page} من ${data.maxPages} (مجموع الطلبات الكلي: ${data.total})</span>`;
             if(data.page < data.maxPages) html += `<button class="page-btn ord-page" data-pg="${data.page+1}">الصفحة التالية</button>`;
             html += '</div>';
             return html;
        };
        
        // Inject shared pagination block into the top of the currently active container or just prepend it
        // A simpler way is to place the pagination above EACH table
        const pageHTML = genPagination();

        newOrdersList.innerHTML = pageHTML + generateTable(pending) + pageHTML;
        shippedOrdersList.innerHTML = pageHTML + generateTable(shipped) + pageHTML;
        deliveredOrdersList.innerHTML = pageHTML + generateTable(delivered) + pageHTML;
        returnedOrdersList.innerHTML = pageHTML + generateTable(returned) + pageHTML;

        const allContainers = [newOrdersList, shippedOrdersList, deliveredOrdersList, returnedOrdersList];
        allContainers.forEach(container => {
          container.querySelectorAll('.ord-page').forEach(btn => {
             btn.addEventListener('click', () => { window.scrollTo({top:0}); loadOrders(parseInt(btn.dataset.pg)); });
          });
          
          container.querySelectorAll('button[data-status]').forEach(btn=>{
            btn.addEventListener('click', async ()=>{
              const id = btn.dataset.status;
              const newStatus = btn.dataset.set;
              
              const aid = JSON.parse(localStorage.getItem('bronco_admin'))?.id;
              const tok = JSON.parse(localStorage.getItem('bronco_admin'))?.auth_token;
              
              if(newStatus === 'delete') {
                  await fetch(API_BASE + '?action=admin_delete_order', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({admin_id:aid, auth_token:tok, id}) });
              } else {
                  await fetch(API_BASE + '?action=admin_update_order_status', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({admin_id:aid, auth_token:tok, id, status:newStatus}) });
              }
              
              loadOrders(currentOrderPage);
            });
          });
        });
      }).catch(err=>{
        console.error(err);
        if (newOrdersList) newOrdersList.textContent = 'خطأ في التحميل.';
      });
  }


// Initialize auth state after all elements are loaded:
checkAuthState();
