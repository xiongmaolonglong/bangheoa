import api from './index'

export function getTenantList(params) {
  return api.get('/tenants', { params })
}

export function createTenant(data) {
  return api.post('/tenants', data)
}

export function getTenantDetail(id) {
  return api.get(`/tenants/${id}`)
}
