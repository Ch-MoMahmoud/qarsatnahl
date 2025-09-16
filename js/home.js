(async function(){
  const grid = document.getElementById('featuredGrid');
  if(!grid) return;

  const el = (tag, cls) => { const e = document.createElement(tag); if(cls) e.className = cls; return e; };

  try{
    const res = await fetch('data/products.json', {cache:'no-store'});
    if(!res.ok) throw new Error('تعذر تحميل ملف المنتجات');
    const data = await res.json();

    // Only active products, sorted by optional sortOrder
    const products = (data.products||[])
      .filter(p=> (p.status||'active') === 'active')
      .sort((a,b)=> (Number(a.sortOrder ?? 9999)) - (Number(b.sortOrder ?? 9999)));
    const featured = products.filter(p=> p.featured === true).slice(0, 4);

    if(featured.length === 0){
      const p = el('p','section-subtitle');
      p.textContent = 'لا توجد منتجات مميّزة حالياً.';
      grid.appendChild(p);
      return;
    }

    const priceFmt = (value)=> `${value} ج.م`;

    grid.innerHTML = '';
    featured.forEach((p, idx)=>{
      const card = el('article','product-card reveal');
      card.setAttribute('data-animate','fade-up');
      card.setAttribute('data-delay', String(140 + idx*60));

      const a = el('a','product-media');
      a.href = `product.html?id=${encodeURIComponent(p.id)}`; a.setAttribute('aria-label', p.title);
      const img = el('img'); img.src = p.thumbnail || (p.images && p.images[0]) || 'imgs/honey.jpeg'; img.alt = p.title; img.loading='lazy';
      a.appendChild(img);

      if(p.discount && p.discount.type === 'percentage' && typeof p.discount.value === 'number'){
        const sale = el('span','product-badge product-badge--sale'); sale.textContent = `${p.discount.value}%`; a.appendChild(sale);
      } else if(p.newArrival || p.featured){
        const badge = el('span','product-badge product-badge--new'); badge.textContent = 'جديد'; a.appendChild(badge);
      }

      const content = el('div','product-content');
      const title = el('h3','product-title'); title.textContent = p.title;
      const priceWrap = el('div','product-price');
      const current = el('span','product-price__current'); current.textContent = priceFmt(p.price); priceWrap.appendChild(current);
      if(p.compareAtPrice && p.compareAtPrice > p.price){ const old = el('span','product-price__old'); old.textContent = priceFmt(p.compareAtPrice); priceWrap.appendChild(old); }
      const btn = el('button','btn btn--add'); btn.type='button'; btn.innerHTML='أضف إلى السلة <i class="fa-solid fa-cart-shopping"></i>';

      content.appendChild(title); content.appendChild(priceWrap); content.appendChild(btn);
      if(window.Cart){ window.Cart.bindButton(btn, p.id); }

      card.appendChild(a); card.appendChild(content);
      grid.appendChild(card);

      // Make entire card clickable (except buttons)
      card.style.cursor = 'pointer';
      card.tabIndex = 0;
      const go = ()=>{ window.location.href = `product.html?id=${encodeURIComponent(p.id)}`; };
      card.addEventListener('click', (e)=>{ if(e.target.closest('button')) return; go(); });
      card.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' '){ if(document.activeElement && document.activeElement.closest('button')) return; e.preventDefault(); go(); } });
    });

    if(window && 'IntersectionObserver' in window){
      const toObserve = grid.querySelectorAll('.reveal');
      const io = new IntersectionObserver((entries)=>{
        entries.forEach((entry)=>{ if(entry.isIntersecting){ const elx = entry.target; const delay = parseInt(elx.getAttribute('data-delay')||'0', 10); elx.classList.add('reveal'); setTimeout(()=> elx.classList.add('in-view'), delay); io.unobserve(elx); } });
      },{ threshold: .15, rootMargin: '0px 0px -10%' });
      toObserve.forEach(elm=> io.observe(elm));
    }

  }catch(err){
    const p = el('p','section-subtitle'); p.textContent = 'حدث خطأ أثناء تحميل المنتجات المميّزة.'; grid.appendChild(p); console.error(err);
  }
})();
