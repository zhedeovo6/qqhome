/* 云服务接入参数（由 WorkBuddy 云服务开通时下发的 publicConfig）
   endpoint / oauthRelayBaseUrl / publishableKey 都是前端可见的公开值，
   发布域名的 Origin 会在服务端被严格校验，其它域名调不通。 */

window.QH_CLOUD = {
  endpoint: 'https://wbapp-pinyljbkapt2d3t8d9a8df.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey: 'wbpk_pinYlJbkApt2d3T8d9a8Df_TfEOEXhQRjdDKYRqy3wyv87B3Y23skJg'
};
