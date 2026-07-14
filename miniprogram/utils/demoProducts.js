const DEMO_PRODUCTS = Object.freeze([
  Object.freeze({
    id: "demo-travel-coffee",
    title: "旅行手冲咖啡套装",
    price: "¥39.90",
    tag: "旅途好物",
    description: "轻量便携，随时享受一杯手冲咖啡",
    imageUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=640&q=80"
  }),
  Object.freeze({
    id: "demo-light-sneakers",
    title: "轻便城市运动鞋",
    price: "¥169.00",
    tag: "出行推荐",
    description: "柔软轻盈，适合城市漫步与短途旅行",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=640&q=80"
  }),
  Object.freeze({
    id: "demo-local-snacks",
    title: "地方风味点心礼盒",
    price: "¥59.80",
    tag: "人气风味",
    description: "精选地方风味，一盒分享旅途记忆",
    imageUrl:
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=640&q=80"
  }),
  Object.freeze({
    id: "demo-travel-bottle",
    title: "随行保温旅行杯",
    price: "¥79.00",
    tag: "日常精选",
    description: "简约耐用，冷热饮随身携带",
    imageUrl:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=640&q=80"
  })
]);

function getFeaturedProducts(limit = DEMO_PRODUCTS.length) {
  const safeLimit = Math.floor(Number(limit));
  if (!Number.isFinite(safeLimit) || safeLimit <= 0) {
    return [];
  }

  return DEMO_PRODUCTS.slice(0, safeLimit).map((product) => ({ ...product }));
}

function pickProduct(seed) {
  if (seed === undefined || seed === null || seed === "") {
    return DEMO_PRODUCTS[0];
  }

  const text = String(seed);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return DEMO_PRODUCTS[hash % DEMO_PRODUCTS.length];
}

module.exports = {
  DEMO_PRODUCTS,
  getFeaturedProducts,
  pickProduct
};
