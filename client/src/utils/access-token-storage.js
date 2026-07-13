import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

import Config from '../constants/Config';

export const setAccessToken = (accessToken) => {
  const { exp } = jwtDecode(accessToken);
  const expires = new Date(exp * 1000);

  Cookies.set(Config.ACCESS_TOKEN_KEY, accessToken, {
    expires,
    secure: window.location.protocol === 'https:',
    sameSite: 'strict',
  });

  Cookies.set(Config.ACCESS_TOKEN_VERSION_KEY, Config.ACCESS_TOKEN_VERSION, {
    expires,
  });
};

export const removeAccessToken = () => {
  Cookies.remove(Config.ACCESS_TOKEN_KEY);
  Cookies.remove(Config.ACCESS_TOKEN_VERSION_KEY);
  Cookies.remove(Config.IMPERSONATION_ACCESS_TOKEN_KEY);
};

export const getAccessToken = () => {
  let accessToken = Cookies.get(Config.ACCESS_TOKEN_KEY);
  const accessTokenVersion = Cookies.get(Config.ACCESS_TOKEN_VERSION_KEY);

  if (accessToken && accessTokenVersion !== Config.ACCESS_TOKEN_VERSION) {
    removeAccessToken();
    accessToken = undefined;
  }

  return accessToken;
};

export const setImpersonationAccessToken = (accessToken) => {
  const { exp } = jwtDecode(accessToken);
  const expires = new Date(exp * 1000);

  Cookies.set(Config.IMPERSONATION_ACCESS_TOKEN_KEY, accessToken, {
    expires,
    secure: window.location.protocol === 'https:',
    sameSite: 'strict',
  });
};

export const removeImpersonationAccessToken = () => {
  Cookies.remove(Config.IMPERSONATION_ACCESS_TOKEN_KEY);
};

export const getImpersonationAccessToken = () => Cookies.get(Config.IMPERSONATION_ACCESS_TOKEN_KEY);
