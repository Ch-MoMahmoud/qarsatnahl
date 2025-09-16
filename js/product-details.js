(async function(){
  const root = document.getElementById('productDetail');
  if(!root) return;

  const params = new URLSearchParams(window.location.search || '');
  const id = params.get('id');

  const el = (tag, cls)=>{ const e = document.createElement(tag); if(cls) e.className = cls; return e; };
  const priceFmt = (value)=> `${value} ج.م`;

  function notFound(msg){
    const box = el('div','product-detail__empty');
    const p = el('p','section-subtitle');
    p.textContent = msg || 'المنتج غير موجود.';
    box.appendChild(p);
    root.innerHTML='';
    root.appendChild(box);
  }

  if(!id){
    notFound('لا يوجد مُعرّف منتج في الرابط.');
    return;
  }

  let data = null;
  try{
    const res = await fetch('data/products.json', { cache: 'no-store' });
    if(!res.ok) throw new Error('تعذر تحميل ملف المنتجات');
    data = await res.json();
  }catch(err){
    console.error(err);
    notFound('تعذر تحميل بيانات المنتج.');
    return;
  }

  const product = (data.products||[]).find(p=> p.id === id);
  if(!product){
    notFound('لم يتم العثور على هذا المنتج.');
    return;
  }

  // Guard: only allow active products
  if((product.status||'active') !== 'active'){
    notFound('هذا المنتج غير متاح حالياً.');
    return;
  }

  // Build layout
  root.innerHTML = '';
  const grid = el('div','product-detail__grid');

  // Media column (right in RTL)
  const media = el('div','pd-media');
  const main = el('div','pd-main');
  const mainImg = el('img');
  mainImg.src = (product.images && product.images[0]) || product.thumbnail || 'imgs/honey.jpeg';
  mainImg.alt = product.title;
  main.appendChild(mainImg);
  media.appendChild(main);

  // Thumbnails
  const thumbs = el('div','pd-thumbs');
  const imgs = (product.images && product.images.length ? product.images : [product.thumbnail || 'imgs/honey.jpeg']);
  imgs.forEach((src, i)=>{
    const b = el('button','pd-thumb');
    const im = el('img'); im.src = src; im.alt = product.title + ' صورة ' + (i+1);
    if(i===0) b.setAttribute('aria-current','true');
    b.appendChild(im);
    b.addEventListener('click', ()=>{
      mainImg.src = src;
      thumbs.querySelectorAll('.pd-thumb[aria-current="true"]').forEach(t=> t.removeAttribute('aria-current'));
      b.setAttribute('aria-current','true');
    });
    thumbs.appendChild(b);
  });
  media.appendChild(thumbs);

  // Info column (left in RTL)
  const info = el('div','pd-info');
  const title = el('h1','pd-title'); title.id = 'productTitle'; title.textContent = product.title;
  const badgesRow = el('div','pd-badges');

  // Optional meta row: rating + reviews count + stock badge + gift wrap
  const meta = el('div','pd-meta');
  if(typeof product.rating === 'number'){
    const stars = el('div','pd-stars');
    const full = Math.round(Math.max(0, Math.min(5, product.rating)));
    for(let i=1;i<=5;i++){ const s = el('i', i<=full ? 'fa-solid fa-star' : 'fa-regular fa-star'); stars.appendChild(s); }
    meta.appendChild(stars);
  }
  if(typeof product.reviewsCount === 'number'){
    const rc = el('span','pd-reviews'); rc.textContent = `(${product.reviewsCount})`; meta.appendChild(rc);
  }
  if(product.giftWrapAvailable){
    const gw = el('span','pd-pill'); gw.textContent = 'تغليف هدية متاح'; meta.appendChild(gw);
  }
  if(product.expiryDate){
    const ex = el('span','pd-exp'); ex.textContent = `الصلاحية: ${product.expiryDate}`; meta.appendChild(ex);
  }

  // Price block
  const priceWrap = el('div','pd-price');
  const current = el('span','pd-price__current'); current.textContent = priceFmt(product.price);
  priceWrap.appendChild(current);
  if(product.compareAtPrice && product.compareAtPrice > product.price){
    const old = el('span','pd-price__old'); old.textContent = priceFmt(product.compareAtPrice);
    priceWrap.appendChild(old);
  }

  // Description
  const desc = el('p','pd-desc'); desc.textContent = product.description || '';

  // Add to cart + custom quantity controls for product page
  const action = el('div','pd-action');
  const actionTop = el('div','pd-action__top');
  const mainBtn = el('button','btn btn--add pd-main-btn');
  mainBtn.type = 'button';
  mainBtn.setAttribute('data-product-id', product.id);
  // prevent cart.js autoBind from attaching extra controls
  mainBtn.setAttribute('data-cart-bound','1');
  mainBtn.innerHTML = 'أضف إلى السلة <i class="fa-solid fa-cart-shopping"></i>';

  // Quantity box
  const qtyBox = el('div','pd-qty');
  const btnPlus = el('button','pd-qty__btn'); btnPlus.type='button'; btnPlus.setAttribute('aria-label','زيادة'); btnPlus.textContent = '+';
  const qtyCount = el('span','pd-qty__count'); qtyCount.textContent = '0';
  const btnMinus = el('button','pd-qty__btn'); btnMinus.type='button'; btnMinus.setAttribute('aria-label','نقصان'); btnMinus.textContent = '−';
  qtyBox.appendChild(btnPlus); qtyBox.appendChild(qtyCount); qtyBox.appendChild(btnMinus);

  actionTop.appendChild(mainBtn);
  actionTop.appendChild(qtyBox);
  action.appendChild(actionTop);

  // Buy Now button under the row
  const buyBtn = el('button','btn pd-buy-btn');
  buyBtn.type = 'button';
  buyBtn.textContent = 'شراء الآن';
  action.appendChild(buyBtn);

  info.appendChild(title);
  info.appendChild(badgesRow);
  info.appendChild(meta);
  info.appendChild(priceWrap);
  info.appendChild(desc);
  info.appendChild(action);

  grid.appendChild(info);
  grid.appendChild(media);
  root.appendChild(grid);

  // Custom behavior synced with Cart
  const Cart = window.Cart;
  const idp = product.id;
  const stockQty = Number(product.stockQuantity ?? Infinity);
  const stockStatus = String(product.stockStatus||'in_stock');
  const isOut = (stockStatus==='out_of_stock') || (Number.isFinite(stockQty) && stockQty<=0);
  const minQty = Math.max(0, Number(product.minOrderQty ?? 0));
  const maxQty = Math.max(0, Number(product.maxOrderQt ?? product.maxOrderQty ?? Infinity));
  const labelAdd = product.preOrder ? 'اطلب مسبقًا' : 'أضف إلى السلة';

  const setQtyDisabled = (disabled)=>{
    btnPlus.disabled = disabled; btnMinus.disabled = disabled;
    if(disabled){ qtyBox.classList.add('pd-qty--disabled'); }
    else{ qtyBox.classList.remove('pd-qty--disabled'); }
  };

  const setMainBtnState = (q)=>{
    if(isOut){
      mainBtn.disabled = true;
      mainBtn.classList.add('pd-main-btn--disabled');
      mainBtn.textContent = 'غير متوفر';
      setQtyDisabled(true);
      buyBtn.disabled = true;
      buyBtn.classList.add('is-disabled');
    } else if(q>0){
      mainBtn.classList.add('pd-main-btn--remove');
      mainBtn.textContent = 'إزالة من السلة';
      setQtyDisabled(false);
      buyBtn.disabled = false;
      buyBtn.classList.remove('is-disabled');
    }else{
      mainBtn.classList.remove('pd-main-btn--remove');
      mainBtn.innerHTML = `${labelAdd} <i class="fa-solid fa-cart-shopping"></i>`;
      mainBtn.disabled = false;
      setQtyDisabled(false);
      buyBtn.disabled = false;
      buyBtn.classList.remove('is-disabled');
    }
    qtyCount.textContent = String(q);
  };

  const add = (delta)=>{
    if(!Cart) return;
    // clamp with stock and min/max constraints
    const cur = Cart.getQty(idp);
    if(delta>0){
      let target = cur + delta;
      if(Number.isFinite(maxQty)) target = Math.min(target, maxQty);
      if(Number.isFinite(stockQty)) target = Math.min(target, stockQty);
      // ensure at least min when first adding
      if(cur===0 && minQty>1) target = Math.max(target, minQty);
      delta = target - cur;
    }else if(delta<0){
      let target = Math.max(0, cur + delta);
      // do not enforce min on decrease; allow going to 0
      delta = target - cur;
    }
    if(delta===0) return;
    const next = Cart.add(idp, delta);
    setMainBtnState(next);
  };

  // initial state from storage
  const initialQ = Cart ? Cart.getQty(idp) : 0;
  setMainBtnState(initialQ);

  mainBtn.addEventListener('click', ()=>{
    const q = Cart ? Cart.getQty(idp) : 0;
    if(isOut){ return; }
    if(q>0){
      // remove all
      add(-q);
    }else{
      add(+1);
    }
  });

  btnPlus.addEventListener('click', ()=>{ if(isOut) return; add(+1); });
  btnMinus.addEventListener('click', ()=>{
    const q = Cart ? Cart.getQty(idp) : 0;
    if(isOut) return;
    if(q>0) add(-1);
  });

  // Buy behavior: ensure at least 1 in cart
  buyBtn.addEventListener('click', ()=>{
    if(isOut) return;
    let q = Cart ? Cart.getQty(idp) : 0;
    if(q<=0){ add(+1); q = Cart ? Cart.getQty(idp) : 1; }
    // Go straight to cart/checkout page
    window.location.href = 'cart.html';
  });

  // keep in sync if cart changes elsewhere
  document.addEventListener('cart:change', (e)=>{
    if(e.detail && e.detail.id === idp){ setMainBtnState(Number(e.detail.qty||0)); }
  });

  // Render badges with required priority
  (function renderBadges(){
    const add = (text, cls='product-badge product-badge--new')=>{ const b = el('span', cls); b.textContent = text; badgesRow.appendChild(b); };
    // 1) Out of stock (only)
    if(isOut){ add('غير متوفر حاليا', 'product-badge product-badge--oos'); return; }
    // 2) Group: New + Bestseller + Discount (together)
    if(product.newArrival) add('جديد');
    if(product.bestseller) add('الأكثر مبيعاً');
    if(product.discount && product.discount.type === 'percentage' && typeof product.discount.value === 'number') add(`${product.discount.value}%`, 'product-badge product-badge--sale');
    // 3) PreOrder
    if(product.preOrder) add('طلب مسبق');
    // 4) Remaining
    if(product.limitedEdition) add('إصدار محدود');
    if(product.bundle) add('باقة');
    if(product.featured && !product.newArrival) add('جديد');
  })();
})();
