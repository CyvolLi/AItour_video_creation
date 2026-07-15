const CLOUD_ENV_ID = "cloud1-5g34ybsmbfe89727";
const STORE_APPID = "wxde7b459287c6bc1b";
const DEFAULT_PRODUCT_ID = "10001033506602";

function getCloudInitOptions() {
  return {
    env: CLOUD_ENV_ID,
    traceUser: true
  };
}

function validateRuntimeConfig(config) {
  const runtimeConfig = config || {
    cloudEnvId: CLOUD_ENV_ID,
    storeAppId: STORE_APPID,
    defaultProductId: DEFAULT_PRODUCT_ID
  };
  const errors = [];

  if (!runtimeConfig.cloudEnvId || !runtimeConfig.cloudEnvId.trim()) {
    errors.push("CLOUD_ENV_ID is required");
  }
  if (
    !runtimeConfig.storeAppId ||
    !runtimeConfig.storeAppId.startsWith("wx")
  ) {
    errors.push("STORE_APPID must start with wx");
  }
  if (
    !runtimeConfig.defaultProductId ||
    !runtimeConfig.defaultProductId.trim()
  ) {
    errors.push("DEFAULT_PRODUCT_ID is required");
  }

  return errors;
}

module.exports = {
  CLOUD_ENV_ID,
  STORE_APPID,
  DEFAULT_PRODUCT_ID,
  getCloudInitOptions,
  validateRuntimeConfig
};
