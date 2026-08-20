/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'JigeumMohaeWidget',
  displayName: '지금 모해',
  deploymentTarget: '16.0',
  colors: {
    $accent: '#FF6F81',
    $widgetBackground: '#271A47',
  },
  frameworks: ['SwiftUI', 'WidgetKit'],
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },
});
