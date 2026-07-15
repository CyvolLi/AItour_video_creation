function createTargetId(random = Math.random) {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const randomValue = Math.floor(random() * 16);
    const value = char === "x" ? randomValue : (randomValue & 0x3) | 0x8;

    return value.toString(16);
  });
}

module.exports = {
  createTargetId
};
