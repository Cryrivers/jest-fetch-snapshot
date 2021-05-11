import fetch, {
  Headers,
  Request,
  Response,
  RequestInfo,
  RequestInit,
} from 'node-fetch';
import * as FormData from 'form-data';
import * as qs from 'query-string';

class FetchSnapshotCollector {
  private snapshots: [RequestInfo, (RequestInit | undefined)?][] = [];
  private collecting = false;
  public startCollecting() {
    this.collecting = true;
  }
  public stopCollecting() {
    this.collecting = false;
  }
  public stopAndClearCollecting() {
    this.stopCollecting();
    this.clearSnapshot();
  }
  /**
   * @internal
   */
  public clearSnapshot() {
    this.snapshots = [];
  }
  /**
   * @internal
   */
  public isCollecting() {
    return this.collecting;
  }
  /**
   * @internal
   */
  public addRequestRecord(snapshot: [RequestInfo, (RequestInit | undefined)?]) {
    this.snapshots.push(snapshot);
  }
  /**
   * @internal
   */
  public getRequests() {
    return this.snapshots;
  }
}

export const fetchSnapshot = new FetchSnapshotCollector();

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
  if (fetchSnapshot.isCollecting()) {
    fetchSnapshot.addRequestRecord(args);
  }
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

type BasicFetchRequestSnapshot = {
  address: string;
  payload: {
    [key: string]: string | string[] | null | undefined;
  };
};

export const basicFetchSnapshotSerializer: jest.SnapshotSerializerPlugin = {
  print: (val, serialize) => {
    const requests = (val as FetchSnapshotCollector).getRequests();
    const normalizedRequests: BasicFetchRequestSnapshot[] = requests.map(
      ([requestInfo, requestInit]) => {
        const reqObject = new Request(requestInfo, requestInit);
        const isGet = reqObject.method === 'GET';
        const queryObj = qs.parseUrl(reqObject.url);
        return {
          address: `${reqObject.method} ${
            isGet ? queryObj.url : reqObject.url
          }`,
          payload: isGet
            ? queryObj.query
            : requestInit &&
              requestInit.body &&
              typeof requestInit.body === 'string'
            ? JSON.parse(requestInit.body)
            : {},
        };
      }
    );
    return serialize(normalizedRequests);
  },
  test: val => val instanceof FetchSnapshotCollector,
};
