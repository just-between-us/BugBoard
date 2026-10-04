export function authRedirectUrl(path: string, redirect?: string) {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`
  const url = `${base}${path.replace(/^\//, '')}`
  return redirect ? `${url}?redirect=${encodeURIComponent(redirect)}` : url
}
