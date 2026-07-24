import * as Linking from 'expo-linking';

export function getClerkSSORedirectUrl() {
  return Linking.createURL('/sso-callback');
}