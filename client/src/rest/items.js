import girderClient from '@openchemistry/girder-client';

import { makeUrl } from '../nodes';

const prefix = 'edp';

export function getItems(ancestors, item, queryParams = {}) {
  const url = makeUrl(ancestors, item, prefix);
  return girderClient().get(url, {
    params: queryParams
  })
    .then(response => response.data );
}

export function getItem(ancestors, item, queryParams = {}) {
  const url = makeUrl(ancestors, item, prefix);
  return girderClient().get(url, {
    params: queryParams
  })
    .then(response => response.data );
}

export function createItem(ancestors, item) {
  const url = makeUrl(ancestors, item, prefix);
  return girderClient().post(url, item)
    .then(response => response.data );
}

export function updateItem(ancestors, item) {
  const url = makeUrl(ancestors, item, prefix);
  return girderClient().patch(url, item)
    .then(response => response.data );
}

export function deleteItem(ancestors, item) {
  const url = makeUrl(ancestors, item, prefix);
  return girderClient().delete(url)
    .then(response => response.data );
}
