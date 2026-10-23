(() => {
  'use strict';
  if (window.top !== window || document.getElementById('tb-price-exporter')) return;

  const moneyRE = /(?:¥|￥)\s*([0-9]+(?:\.[0-9]{1,2})?)/g;
  const discountWords = /优惠|券|红包|满减|补贴|淘金币|立减|省[¥￥]?\s*\d|折扣|活动|到手|实付|合计/i;
  const clean = (text) => (text || '').replace(/\s+/g, ' ').trim();
  const money = (text) => [...(text || '').matchAll(moneyRE)].map((m) => Number(m[1]));
  const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const stamp = () => new Date().toLocaleString('sv-SE').replace(/[ :]/g, '-');
  const amountAfter = (text, pattern) => {
    const match = text.match(new RegExp(`(?:${pattern})[^¥￥0-9]{0,24}[¥￥]\\s*([0-9]+(?:\\.[0-9]{1,2})?)`, 'i'));
    return match ? Number(match[1]) : '';
  };
  const readableOffers = (text) => {
    const types = [['券', '商品券|店铺券|优惠券|领券'], ['红包', '平台红包|红包'], ['满减', '跨店满减|满减|每满'], ['补贴', '补贴|立减|折扣|活动'], ['会员/淘金币', '淘金币|会员|88VIP']];
    const offers = types.flatMap(([label, pattern]) => {
      const match = text.match(new RegExp(`(?:${pattern})[^。；;]{0,100}`, 'i'));
      return match ? [`${label}：${clean(match[0])}`] : [];
    });
    return [...new Set(offers)].join('；').slice(0, 700);
  };

  function productNodes() {
    const links = [...document.querySelectorAll('a[href*="item.taobao.com/item"], a[href*="detail.tmall.com/item"]')];
    const seen = new Set();
    return links.map((link) => {
      let node = link;
      for (let i = 0; i < 7 && node?.parentElement; i++, node = node.parentElement) {
        const text = clean(node.innerText);
        if (text.length >= 12 && text.length <= 5000 && money(text).length) break;
      }
      return node;
    }).filter((node) => node && !seen.has(node) && seen.add(node));
  }

  function readItem(node, index) {
    const text = clean(node.innerText);
    const link = node.querySelector('a[href*="item.taobao.com/item"], a[href*="detail.tmall.com/item"]');
    const image = node.querySelector('img[alt], img');
    const title = clean(link?.innerText) || clean(image?.alt) || clean(node.querySelector('[title]')?.getAttribute('title')) || `商品 ${index + 1}`;
    const amounts = money(text);
    const handPrice = amounts.length ? Math.min(...amounts) : '';
    return {
      index: index + 1,
      title,
      url: link?.href || '',
      listPrice: amountAfter(text, '原价|标价|划线价|日常价') || (amounts.length ? Math.max(...amounts) : ''),
      handPrice,
      itemCoupon: amountAfter(text, '商品券|店铺券|优惠券|领券') || '',
      platformRedPacket: amountAfter(text, '平台红包|红包') || '',
      crossStoreDiscount: amountAfter(text, '跨店满减|满减|每满') || '',
      memberOrCoins: amountAfter(text, '淘金币|会员|88VIP') || '',
      shipping: amountAfter(text, '运费') || '',
      visibleOffers: globalThis.cartOfferSummary(node.innerText),
      pageText: text.slice(0, 3000)
    };
  }

  function pageSummary() {
    const text = clean(document.body.innerText);
    const lines = text.split(/(?<=[。；;])|(?=合计|总计|实付|到手|优惠|红包|运费)/).filter((line) => /合计|总计|实付|到手|优惠|红包|运费/i.test(line));
    return { title: document.title, url: location.href, capturedAt: new Date().toISOString(), visibleSummary: lines.join(' | ').slice(0, 5000) };
  }

  function download(filename, contents, type) {
    const url = URL.createObjectURL(new Blob([contents], { type: `${type};charset=utf-8` }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportVisibleData() {
    const items = productNodes().map(readItem);
    const summary = pageSummary();
    const rows = [
      ['订单汇总'], ['导出时间', summary.capturedAt], ['页面标题', summary.title], ['页面地址', summary.url], ['页面优惠/合计摘要', summary.visibleSummary], [],
      ['商品明细'], ['序号', '商品', '链接', '标价/最高可见价', '到手价（最低可见价）', '商品/店铺券', '平台红包', '跨店满减', '会员/淘金币', '运费', '可见优惠信息']
    ];
    items.forEach((item) => rows.push([item.index, item.title, item.url, item.listPrice, item.handPrice, item.itemCoupon, item.platformRedPacket, item.crossStoreDiscount, item.memberOrCoins, item.shipping, item.visibleOffers]));
    const csv = '\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
    download(`淘宝价格导出_${stamp()}.csv`, csv, 'text/csv');
    download(`淘宝价格原始快照_${stamp()}.json`, JSON.stringify({ summary, items }, null, 2), 'application/json');
    button.textContent = `已导出 ${items.length} 件商品`;
    setTimeout(() => { button.textContent = '导出可见价格与优惠'; }, 2400);
  }

  const button = document.createElement('button');
  button.id = 'tb-price-exporter'; button.type = 'button'; button.textContent = '导出可见价格与优惠';
  button.title = '只读取当前页面已显示的数据；会下载 CSV 和 JSON 两个文件';
  button.addEventListener('click', exportVisibleData);
  document.documentElement.append(button);
})();
