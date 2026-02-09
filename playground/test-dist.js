import { initSSO, getConfig } from '../dist/index.js';

console.log('Testing initSSO...');

try {
  const { config, handlers } = initSSO({
    appUrl: 'http://localhost:4000',
    ssoUrl: 'https://sso.example.com',
    protectedRoutes: ['/dashboard'],
    endpoints: {
      login: 'https://api.example.com/login'
    }
  });

  console.log('SSO Initialized successfully.');

  const currentConfig = getConfig();
  console.log('Current Config App URL:', currentConfig.NEXT_PUBLIC_APP_URL);

  if (currentConfig.NEXT_PUBLIC_APP_URL === 'http://localhost:4000') {
    console.log('SUCCESS: Config updated correctly.');
  } else {
    console.error('FAILURE: Config not updated as expected.');
    process.exit(1);
  }

  if (currentConfig.ENDPOINTS.login === 'https://api.example.com/login') {
    console.log('SUCCESS: Endpoints updated correctly.');
  } else {
    console.error('FAILURE: Endpoints not updated as expected.');
    process.exit(1);
  }

  console.log('Test passed!');
} catch (error) {
  console.error('Test failed with error:', error);
  process.exit(1);
}
