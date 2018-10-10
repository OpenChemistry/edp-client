import { has, isNil } from 'lodash-es';

export const PROJECT_NODE = 'PROJECT_NODE';
export const CYCLE_NODE = 'CYCLE_NODE';
export const POSTMORTEM_NODE = 'POSTMORTEM_NODE';
export const BATCH_NODE = 'BATCH_NODE';
export const TEST0_NODE = 'TEST0_NODE';
export const TEST1_NODE = 'TEST1_NODE';

export const ROOT_NODE = 'ROOT_NODE';

export const NODES = {
  [ROOT_NODE] : {
    label: '',
    url: '',
    children: [PROJECT_NODE],
  },
  [PROJECT_NODE] : {
    label: 'Project',
    url: 'projects',
    children: [CYCLE_NODE, POSTMORTEM_NODE],
    parentId: null,
    primaryField: 'title',
    secondaryField: 'startDate',
  },
  [CYCLE_NODE] : {
    label: 'Cycle',
    url: 'cycles',
    children: [BATCH_NODE],
    parentId: 'projectId',
    primaryField: 'title',
    secondaryField: 'startDate',
  },
  [BATCH_NODE] : {
    label: 'Batch',
    url: 'batches',
    children: [TEST0_NODE],
    parentId: 'cycleId',
    primaryField: 'title',
    secondaryField: 'startDate',
  },
  [TEST0_NODE] : {
    label: 'Test',
    url: 'tests',
    children: [],
    parentId: 'batchId',
    fileFields: ['dataFile', 'metaDataFile'],
    primaryField: 'channel',
    primaryPrefix: 'Channel',
    secondaryField: 'startDate',
  },
  [POSTMORTEM_NODE] : {
    label: 'Post mortem',
    url: 'postmortems',
    children: [TEST1_NODE],
    parentId: 'projectId',
    primaryField: 'title',
    secondaryField: 'startDate'
  },
  [TEST1_NODE] : {
    label: 'Test',
    url: 'tests',
    children: [],
    parentId: 'postmortemId',
    fileFields: ['imageFile'],
    primaryField: 'cellId',
    secondaryField: 'startDate'
  },
}

export function getNodeType(url, index) {
  const map = {
    0: {
      [NODES[PROJECT_NODE].url]: PROJECT_NODE
    },
    1: {
      [NODES[CYCLE_NODE].url]: CYCLE_NODE,
      [NODES[POSTMORTEM_NODE].url]: POSTMORTEM_NODE
    },
    2: {
      [NODES[BATCH_NODE].url]: BATCH_NODE,
      [NODES[TEST1_NODE].url]: TEST1_NODE
    },
    3: {
      [NODES[TEST0_NODE].url]: TEST0_NODE
    },
  }

  if (has(map, `${index}.${url}`)) {
    return map[index][url];
  }

  console.warn('No matching node for this url');
  return null;
}

export function makeUrl(ancestors, item, prefix = '') {
  let url = prefix;
  for (let ancestor of ancestors) {
    const { type, _id } = ancestor;
    if (!isNil(_id)) {
      url += `/${NODES[type].url}/${_id}`;
    }
  }
  const { type, _id } = item;
  if (type !== ROOT_NODE) {
    url += `/${NODES[type].url}`;
    if (!isNil(_id)) {
      url += `/${_id}`;
    }
  }
  return url;
}

export function parseUrl(url) {
  let regexStr = `((\\w+)\\/(\\w+)?)(\\/(\\w+)\\/(\\w+)?)?(\\/(\\w+)\\/(\\w+)?)?(\\/(\\w+)\\/(\\w+)?)?(\\/(\\w+)\\/(\\w+)?)?`;
  let regex = new RegExp(regexStr);
  let mo = url.match(regex);

  let ancestors = [];
  if (mo) {
    for (let i = 0; i < 4; ++i) {
      const idGroup = (i + 1) * 3;
      const urlGroup = idGroup - 1;
      let _id = null;
      let url = null;

      if (!isNil(mo[urlGroup])) {
        url = mo[urlGroup];
      }

      if (!isNil(mo[idGroup])) {
        _id = mo[idGroup];
      }

      if (isNil(url) && isNil(_id)) {
        break;
      }

      ancestors.push(
        {
          type: getNodeType(url, i),
          _id,
          url
        }
      )
    }
  }
  return ancestors;
}

export function parseUrlMatch(match) {
  const ancestors = [];
  // Up to 5 depth
  for (let i = 0; i < 5; ++i) {
    let url = match.params[`url${i}`];
    let _id = match.params[`id${i}`];

    if (!isNil(url)) {
      let type = getNodeType(url, i);
      ancestors.push({
        url,
        _id,
        type
      })
    }
  }
  return ancestors;
}