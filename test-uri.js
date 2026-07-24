const AuthSession = require('expo-auth-session');
const Linking = require('expo-linking');

console.log(AuthSession.makeRedirectUri({ path: "sso-callback" }));
console.log(Linking.createURL('/sso-callback'));
