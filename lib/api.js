async function request(url, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (res.status === 401) { window.location.href = '/login'; return }
  const data = await res.json()
  if (!res.ok) throw data.error || '请求失败'
  return data
}

export const api = {
  get: (url, params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request(url + qs)
  },
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
}
