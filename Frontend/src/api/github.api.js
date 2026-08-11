import apiClient from '../lib/apiClient';

export const getRepositories = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories${query ? `?${query}` : ''}`);
};

export const getRepoContents = (owner, repo, path = '', params = {}) => {
  const query = new URLSearchParams(params).toString();
  const contentPath = path ? `/${path}` : '';
  return apiClient.get(`/github/repositories/${owner}/${repo}/contents${contentPath}${query ? `?${query}` : ''}`);
};

export const getRepoBranches = (owner, repo, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/branches${query ? `?${query}` : ''}`);
};

export const searchRepo = (owner, repo, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/search?${query}`);
};
