(() => {
  'use strict';
  globalThis.cartOfferSummary = (text) => {
    const source = String(text || '').replace(/\s+/g, ' ');
    const hits = [...source.matchAll(/平台红包|店铺优惠券|商品券|店铺券|优惠券|领券|红包|跨店满减|满减|每满|官方补贴|补贴|促销|立减|折扣|淘金币|京豆|88VIP|PLUS|会员|白条/gi)];
    const results = new Set();
    hits.forEach((hit, index) => {
      const label = hit[0];
      const end = Math.min(hit.index + 60, hits[index + 1]?.index ?? source.length);
      const fragment = source.slice(hit.index + label.length, end).split(/删除|移入收藏|移入关注|修改|数量|小计|去结算|查看详情|立即领取|商品名称|规格|到手价|实付|原价|京东价/)[0];
      const threshold = fragment.match(/(?:每)?满\s*[¥￥]?\s*(\d+(?:\.\d+)?)\s*元?\s*减\s*[¥￥]?\s*(\d+(?:\.\d+)?)/);
      const reduction = fragment.match(/(?:抵扣|抵|减|省|优惠|补贴)?\s*[¥￥]\s*(\d+(?:\.\d+)?)/)
        || fragment.match(/(?:抵扣|抵|减|省|优惠|补贴)\s*(\d+(?:\.\d+)?)\s*元?/)
        || fragment.match(/^\s*[:：]?\s*(\d+(?:\.\d+)?)\s*元/);
      const percent = fragment.match(/(\d+(?:\.\d+)?)\s*(折|%)/);
      let rule = '';
      if (threshold) rule = (/每满/.test(label + fragment) ? '每' : '') + '满' + threshold[1] + '减' + threshold[2];
      else if (/每满|满减/.test(label)) {
        const pair = fragment.match(/^\s*(\d+(?:\.\d+)?)\s*减\s*(\d+(?:\.\d+)?)/);
        if (pair) rule = (label === '每满' ? '每' : '') + '满' + pair[1] + '减' + pair[2];
      }
      else if (percent) rule = percent[1] + percent[2];
      else if (reduction) rule = '减' + reduction[1] + '元';
      if (!rule) return;
      const category = /券/.test(label) ? (/店铺/.test(label) ? '店铺券' : /商品/.test(label) ? '商品券' : '优惠券')
        : /红包/.test(label) ? '红包' : /满减|每满/.test(label) ? '满减'
        : /补贴|立减/.test(label) ? '补贴/立减' : label.toUpperCase();
      results.add(category + '：' + rule);
    });
    return [...results].join('\n');
  };
})();
