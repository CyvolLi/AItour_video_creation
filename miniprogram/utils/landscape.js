const LANDSCAPE_OPTIONS = [
  {
    id: "sharepool",
    name: "公共分享池",
    shortName: "推荐",
    desc: "大家都在看的旅行灵感",
    cover: "https://tr-osdcp.qunarzz.com/tr-osd-tr-space/img/bfce80ecbf046c6d76d46759b04e10eb.jpg"
  },
  {
    id: "001",
    name: "越秀风行",
    shortName: "越秀",
    desc: "城市风景专区正在更新",
    cover: "https://data.ruralv.cn/asset/yue.jpg"
  },
  {
    id: "002",
    name: "哈工深",
    shortName: "哈工深",
    desc: "校园影像与青春故事",
    cover: "https://n.sinaimg.cn/sinacn01/786/w980h606/20181117/b503-hnyuqhh2236078.png"
  }
];

function normalizeLandscapeId(landscape) {
  return landscape || "sharepool";
}

function getLandscapeName(landscape) {
  const id = normalizeLandscapeId(landscape);
  const option = LANDSCAPE_OPTIONS.find((item) => item.id === id);

  return option ? option.name : "公共分享池";
}

function getLandscapeOption(landscape) {
  const id = normalizeLandscapeId(landscape);
  return (
    LANDSCAPE_OPTIONS.find((item) => item.id === id) || LANDSCAPE_OPTIONS[0]
  );
}

function syncTaskLandscape(taskData, landscape) {
  const option = getLandscapeOption(landscape);

  taskData.landscape = option.id;
  taskData.landscape_name = option.name;

  return option;
}

module.exports = {
  LANDSCAPE_OPTIONS,
  getLandscapeName,
  getLandscapeOption,
  normalizeLandscapeId,
  syncTaskLandscape
};
