import { fetch } from 'whatwg-fetch';

import Config from '../constants/Config';

const http = {};

// TODO: add all methods
['GET', 'POST'].forEach((method) => {
  http[method.toLowerCase()] = (url, data, headers = {}) => {
    let body;
    let requestHeaders = { ...headers };

    if (data instanceof FormData) {
      body = data;
    } else if (typeof data === 'string') {
      body = data;
      requestHeaders['Content-Type'] = 'application/json';
    } else if (data) {
      body = new FormData();
      Object.keys(data).forEach((key) => {
        body.append(key, data[key]);
      });
    }

    return fetch(`${Config.SERVER_BASE_URL}/api${url}`, {
      method,
      headers: requestHeaders,
      body,
    })
      .then((response) =>
        response.json().then((body) => ({
          body,
          isError: response.status !== 200,
        })),
      )
      .then(({ body, isError }) => {
        if (isError) {
          throw body;
        }

        return body;
      });
  };
});

export default http;
