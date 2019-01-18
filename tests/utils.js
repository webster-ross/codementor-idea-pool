export function verifyHeader(response) {
  expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
  expect(response.headers['x-xss-protection']).toBe('1; mode=block')
  expect(response.headers['x-content-type-options']).toBe('nosniff')
  expect(response.headers['content-type']).toBe('application/json; charset=utf-8')
  expect(response.headers['vary']).toBe('Accept-Encoding, Origin')
  expect(response.headers['etag']).toBeTruthy()
  expect(response.headers['cache-control']).toBe('private,must-revalidate,max-age=0')
  expect(response.headers['x-request-id']).toBeTruthy()
  expect(response.headers['x-runtime']).toBeTruthy()
  expect(response.headers['content-length']).toBeTruthy()
}
