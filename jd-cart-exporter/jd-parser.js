(() => {
  globalThis.parseJdPriceText = (raw) => {
    const text = String(raw || '').replace(/\s+/g, ' ').trim();
    const specification = text.match(/(?:^|\s)商品\s+(.+?)(?=\s+服务(?:\s|$)|\s+赠品(?:\s|$)|\s*[¥￥]|$)/)?.[1]?.trim() || '';
    const price = text.match(/[¥￥]\s*(\d+(?:\.\d+)?)\s*((?:政府|学生|补贴)?到手价|政府补贴价|补贴价)/);
    const applied = text.match(/已享\s*(.*?)(?=可享|移入收藏|删除|换促销|限购|$)/)?.[1]?.trim() || '';
    const available = text.match(/可享\s*(.*?)(?=移入收藏|删除|换促销|限购|$)/)?.[1]?.trim() || '';
    const nextPrice = price ? text.slice(price.index + price[0].length).match(/^\s*[¥￥]\s*(\d+(?:\.\d+)?)/) : null;
    const totalDiscount = price && nextPrice
      ? (Math.round(Number(nextPrice[1]) * 100) - Math.round(Number(price[1]) * 100)) / 100
      : '';
    const ruleText = applied.replace(/等?优惠\s*[¥￥]?\s*\d+(?:\.\d+)?/, '').trim();
    const get = (regex) => ruleText.match(regex)?.[0] || '';
    return {
      specification,
      handPrice: price ? Number(price[1]) : '',
      listPrice: nextPrice ? Number(nextPrice[1]) : '',
      priceType: price?.[2] || '',
      status: /已下架|暂不支持购买/.test(text) ? '已下架' : '正常',
      itemCoupon: get(/(?:商品券|店铺券|优惠券)[^，；]{0,30}/),
      platformRedPacket: get(/(?:平台)?红包[^，；]{0,20}/),
      crossStoreDiscount: get(/(?:跨店)?(?:每)?满\d+(?:\.\d+)?减\d+(?:\.\d+)?/),
      memberOrCoins: get(/(?:PLUS|京豆|会员)[^，；]{0,25}/i),
      directDiscount: get(/官方直降\d+(?:\.\d+)?%?/),
      subsidy: get(/政府补贴|焕新补贴|官方补贴/),
      percentageDiscount: get(/满\d+(?:\.\d+)?享\d+(?:\.\d+)?折/),
      totalDiscount,
      visibleOffers: ruleText,
      availableOffers: available
    };
  };
})();
