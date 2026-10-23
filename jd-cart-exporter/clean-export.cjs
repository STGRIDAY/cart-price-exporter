const fs = require('node:fs');
require('./jd-parser.js');
const source = fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, '');
const rows = []; let row = [], cell = '', quoted = false;
for (let i = 0; i < source.length; i++) {
  const c = source[i];
  if (c === '"') { if (quoted && source[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
  else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
  else if (c === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
  else cell += c;
}
if (cell || row.length) { row.push(cell); rows.push(row); }
const start = rows.findIndex(r => r[0] === '序号');
const headers = ['序号','商品','商品规格/款式','状态','链接','标价','到手价','价格类型','商品/店铺券','平台红包','已享满减','PLUS/京豆','官方直降','补贴类型','折扣规则','页面已享总优惠','已享优惠摘要','可享优惠（未计入当前价）'];
const output = [headers];
for (const r of rows.slice(start + 1).filter(r => /^\d+$/.test(r[0]))) {
  const p = parseJdPriceText(r[r.length - 1]);
  output.push([r[0],r[1],p.specification,p.status,r[2],p.listPrice,p.handPrice,p.priceType,p.itemCoupon,p.platformRedPacket,p.crossStoreDiscount,p.memberOrCoins,p.directDiscount,p.subsidy,p.percentageDiscount,p.totalDiscount === '' ? '' : p.totalDiscount.toFixed(2),p.visibleOffers,p.availableOffers]);
}
fs.writeFileSync(process.argv[3], '\uFEFF' + output.map(r => r.map(v => '"' + String(v ?? '').replaceAll('"','""') + '"').join(',')).join('\r\n'));
console.log('已整理商品数：' + (output.length - 1));
console.log(output.slice(1).map(r => [r[0],r[5],r[15],r[16]].join(' | ')).join('\n'));
