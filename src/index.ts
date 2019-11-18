// const { default: fetch, Headers } = require('node-fetch');
import fetch, { Headers, Request, Response } from 'node-fetch';
import * as FormData from 'form-data';

const SNAPSHOT_DIR = '__requests__';

declare global {
  namespace NodeJS {
    interface Global {
      FormData: typeof FormData;
      Headers: typeof Headers;
      fetch: typeof fetch;
      Request: typeof Request;
      Response: typeof Response;
    }
  }
}

const interceptedFetch: typeof fetch = (...args) => {
  return fetch(...args);
};

interceptedFetch.isRedirect = fetch.isRedirect;

export function polyfillFetch() {
  global.FormData = FormData;
  global.Headers = Headers;
  global.fetch = interceptedFetch;
  global.Request = Request;
  global.Response = Response;
}
