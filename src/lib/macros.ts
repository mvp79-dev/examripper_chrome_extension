export function getBaseURL() {
  if (Bun.env.DEBUG === 'true') {
    return 'http://127.0.0.1:8000';
  }
  return 'https://examripper-288287396080.herokuapp.com';
}
