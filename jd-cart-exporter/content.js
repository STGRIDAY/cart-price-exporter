(() => {
  'use strict';
  if (window.top !== window || document.getElementById('jd-price-exporter')) return;

  const moneyRE = /(?:¥|￥)\s*([0-9]+(?:\.[0-9]{1,2})?)/g;
  const discountWords = /优惠|券|京豆|红包|满减|补贴|促销|立减|省[¥￥]?\s*\d|到手|实付|总额|返现|PLUS|白条/i;
  const clean = (text) => (text || '').replace(/\s+/g, ' ').trim();
  const money = (text) => [...(text || '').matchAll(moneyRE)].map((m) => Number(m[1]));
  const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const stamp = () => new Date().toLocaleString('sv-SE').replace(/[ :]/g, '-');
  const amountAfter = (text, pattern) => {
    const match = text.match(new RegExp(`(?:${pattern})[^¥￥0-9]{0,24}[¥￥]\\s*([0-9]+(?:\\.[0-9]{1,2})?)`, 'i'));
    return match ? Number(match[1]) : '';
  };
  const readableOffers = (text) => {
    const types = [['券', '商品券|店铺券|优惠券|领券'], ['红包', '平台红包|红包'], ['满减', '跨店满减|满减|每满'], ['补贴/促销', '补贴|促销|立减|折扣'], ['PLUS/京豆', '京豆|PLUS|会员'], ['白条', '白条']];
    const offers = types.flatMap(([label, pattern]) => {
      const match = text.match(new RegExp(`(?:${pattern})[^。；;]{0,100}`, 'i'));
      return match ? [`${label}：${clean(match[0])}`] : [];
    });
    return [...new Set(offers)].join('；').slice(0, 700);
  };

  function productNodes() {
    const links = [...document.querySelectorAll('a[href*="item.jd.com/"], a[href*="item.m.jd.com/"]')];
    const seen = new Set();
    return links.map((link) => {
      let node = link;
      for (let i = 0; i < 8 && node?.parentElement; i++, node = node.parentElement) {
        const text = clean(node.innerText);
        if (text.length >= 12 && text.length <= 6000 && money(text).length) break;
      }
      return node;
    }).filter((node) => node && !seen.has(node) && seen.add(node));
  }

  function readItem(node, index) {
    const text = clean(node.innerText);
    const link = node.querySelector('a[href*="item.jd.com/"], a[href*="item.m.jd.com/"]');
    const image = node.querySelector('img[alt], img');
    const title = clean(link?.innerText) || clean(image?.alt) || clean(node.querySelector('[title]')?.getAttribute('title')) || `商品 ${index + 1}`;
    const amounts = money(text);
    const handPrice = amounts.length ? Math.min(...amounts) : '';
    return { index: index + 1, title, url: link?.href || '', listPrice: amountAfter(text, '原价|标价|划线价|京东价') || (amounts.length ? Math.max(...amounts) : ''), handPrice, itemCoupon: amountAfter(text, '商品券|店铺券|优惠券|领券') || '', platformRedPacket: amountAfter(text, '平台红包|红包') || '', crossStoreDiscount: amountAfter(text, '跨店满减|满减|每满') || '', memberOrCoins: amountAfter(text, '京豆|PLUS|会员') || '', shipping: amountAfter(text, '运费') || '', visibleOffers: globalThis.cartOfferSummary(node.innerText), pageText: text.slice(0, 3000) };
  }

  function pageSummary() {
    const text = clean(document.body.innerText);
    const lines = text.split(/(?<=[。；;])|(?=应付|实付|总额|总计|优惠|红包|运费|京豆|白条)/).filter((line) => /应付|实付|总额|总计|优惠|红包|运费|京豆|白条/i.test(line));
    return { title: document.title, url: location.href, capturedAt: new Date().toISOString(), visibleSummary: lines.join(' | ').slice(0, 5000) };
  }

  function download(filename, contents, type) {
    const url = URL.createObjectURL(new Blob([contents], { type: `${type};charset=utf-8` }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportVisibleData() {
    const items = productNodes().map(readItem).map(item => ({ ...item, ...globalThis.parseJdPriceText(item.pageText) }));
    const summary = pageSummary();
    const rows = [['序号', '商品', '商品规格/款式', '状态', '链接', '标价', '到手价', '价格类型', '商品/店铺券', '平台红包', '已享满减', 'PLUS/京豆', '官方直降', '补贴类型', '折扣规则', '页面已享总优惠', '已享优惠摘要', '可享优惠（未计入当前价）']];
    items.forEach((item) => rows.push([item.index, item.title, item.specification, item.status, item.url, item.listPrice, item.handPrice, item.priceType, item.itemCoupon, item.platformRedPacket, item.crossStoreDiscount, item.memberOrCoins, item.directDiscount, item.subsidy, item.percentageDiscount, item.totalDiscount === '' ? '' : item.totalDiscount.toFixed(2), item.visibleOffers, item.availableOffers]));
    download(`京东价格导出_${stamp()}.csv`, '\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n'), 'text/csv');
    download(`京东价格原始快照_${stamp()}.json`, JSON.stringify({ summary, items }, null, 2), 'application/json');
    button.textContent = `已导出 ${items.length} 件商品`;
    setTimeout(() => { button.textContent = '导出可见价格与优惠'; }, 2400);
  }

  const button = document.createElement('button');
  button.id = 'jd-price-exporter'; button.type = 'button'; button.textContent = '导出可见价格与优惠';
  button.title = '只读取当前页面已显示的数据；会下载 CSV 和 JSON 两个文件';
  button.addEventListener('click', exportVisibleData);
  document.documentElement.append(button);
})();
