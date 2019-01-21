export function verifyHeaders(response, ignore = []) {
  const headers = {
    'x-frame-options': {
      value:'SAMEORIGIN',
      verify: expect(response.headers['x-frame-options']).toBe
    },
    'x-xss-protection': {
      value:'1; mode=block',
      verify: expect(response.headers['x-xss-protection']).toBe
    },
    'x-content-type-options': {
      value:'nosniff',
      verify: expect(response.headers['x-content-type-options']).toBe
    },
    'content-type': {
      value:'application/json; charset=utf-8',
      verify: expect(response.headers['content-type']).toBe
    },
    'vary': {
      value:'Accept-Encoding, Origin',
      verify: expect(response.headers['vary']).toBe
    },
    'etag': {
      verify: expect(response.headers['etag']).toBeTruthy
    },
    'cache-control': {
      value:'private,must-revalidate,max-age=0',
      verify: expect(response.headers['cache-control']).toBe
    },
    'x-runtime': {
      verify: expect(response.headers['x-runtime']).toBeTruthy
    },
    'x-request-id': {
      verify: expect(response.headers['x-request-id']).toBeTruthy
    },
    'content-length': {
      verify: expect(response.headers['content-length']).toBeTruthy
    },
  }

  ignore.forEach(header => delete headers[header])

  for (let [, header] of Object.entries(headers)) {
    header.verify(header.value)
  }
}
