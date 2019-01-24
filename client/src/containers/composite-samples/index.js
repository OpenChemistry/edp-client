import React, { Component } from 'react';

import { connect } from 'react-redux';
import { replace } from 'connected-react-router';

import { TIMESERIE_NODE, SAMPLE_NODE } from '../../nodes/sow8/hierarchy';

import { getSamples, fetchSamples, fetchTimeSerie } from '../../redux/ducks/composites';

import { parseUrlMatch } from '../../nodes';
import CompositeSamples from '../../components/composite-samples';
import SamplesDetails from './details';

import NotFoundPage from '../../components/notFound.js';

const identity = val => val;

const arraySerialize = val => JSON.stringify(val);
const arrayDeserialize = val => JSON.parse(val);

const numberSerialize = val => val;
const numberDeserialize = val => parseFloat(val);

const boolSerialize = val => val ? 'true' : 'false';
const boolDeserialize = val => val.toLowerCase() === 'true';

const setSerialize = val => JSON.stringify(Array.from(val));
const setDeserialize = val => {
  const arr = JSON.parse(val);
  return Array.isArray(arr) ? new Set(arr) : new Set();
};

const defaultWrapper = (fn, def) => {
  return (val) => {
    if (val !== null && val !== undefined) {
      try {
        return fn(val);
      } catch {
        return def;
      }
    } else {
      return def;
    }
  }
}

const URL_PARAMS = {
  platemapId: {
    serialize: defaultWrapper(identity, null),
    deserialize: defaultWrapper(identity, null)
  },
  runId: {
    serialize: defaultWrapper(identity, null),
    deserialize: defaultWrapper(identity, null)
  },
  selectedSampleKeys: {
    serialize: defaultWrapper(setSerialize, '[]'),
    deserialize: defaultWrapper(setDeserialize, new Set())
  },
  display: {
    serialize: defaultWrapper(identity, null),
    deserialize: defaultWrapper(identity, 'spectrum')
  },
  scalarField: {
    serialize: defaultWrapper(identity, null),
    deserialize: defaultWrapper(identity, null)
  },
  activeMap: {
    serialize: defaultWrapper(identity, null),
    deserialize: defaultWrapper(identity, 'Viridis')
  },
  colorMapRange: {
    serialize: defaultWrapper(arraySerialize, null),
    deserialize: defaultWrapper(arrayDeserialize, [0, 1])
  },
  xAxisS: {
    serialize: defaultWrapper(identity, null),
    deserialize: defaultWrapper(identity, null)
  },
  yAxisS: {
    serialize: defaultWrapper(identity, null),
    deserialize: defaultWrapper(identity, null)
  },
  yOffsetS: {
    serialize: defaultWrapper(numberSerialize, null),
    deserialize: defaultWrapper(numberDeserialize, 0)
  },
  yAxisH: {
    serialize: defaultWrapper(identity, null),
    deserialize: defaultWrapper(identity, null)
  },
  zAxisH: {
    serialize: defaultWrapper(identity, null),
    deserialize: defaultWrapper(identity, null)
  },
  reduceFnH: {
    serialize: defaultWrapper(identity, null),
    deserialize: defaultWrapper(identity, 'median')
  },
  separateSlopeH: {
    serialize: defaultWrapper(boolSerialize, null),
    deserialize: defaultWrapper(boolDeserialize, true)
  },
  selectionH: {
    serialize: defaultWrapper(identity, null),
    deserialize: defaultWrapper(identity, '')
  },
  fitted: {
    serialize: defaultWrapper(boolSerialize, null),
    deserialize: defaultWrapper(boolDeserialize, false)
  }
}

class CompositeSamplesContainer extends Component {

  constructor(props) {
    super(props);
    this.callbacks = {
      fitted: (currValue, nextValue) => {
        const { selectedSampleKeys } = this.props;
        for (let _id of selectedSampleKeys.values()) {
          this.fetchSampleTimeSeries({_id}, nextValue);
        }
      }
    }
  }

  componentDidMount() {
    const { dispatch, ancestors, item, platemapId, runId, selectedSampleKeys, fitted } = this.props;
    dispatch(fetchSamples({ancestors, item, platemapId, runId}));
    for (let _id of selectedSampleKeys.values()) {
      this.fetchSampleTimeSeries({_id}, fitted);
    }
  }

  onSampleSelectById = (id) => {
    const { samples, selectedSampleKeys } = this.props;
    const matches = samples.filter((s) => s.sampleNum == id);
    if (matches.length === 0) {
      return;
    }

    const sample = matches[0];

    if (selectedSampleKeys.has(sample._id)) {
      return;
    }

    this.onSampleSelect(sample);
  }

  onClearSelection = () => {
    this.onParamChanged('selectedSampleKeys', new Set());
  }

  onSampleSelect = (sample) => {
    const { fitted } = this.props;
    this.fetchSampleTimeSeries(sample, fitted);
    const selectedSampleKeys = new Set(this.props['selectedSampleKeys']);
    selectedSampleKeys.add(sample._id);
    this.onParamChanged('selectedSampleKeys', selectedSampleKeys);
  }

  onSampleDeselect = (sample) => {
    const selectedSampleKeys = new Set(this.props['selectedSampleKeys']);
    selectedSampleKeys.delete(sample._id);
    this.onParamChanged('selectedSampleKeys', selectedSampleKeys);
  }

  fetchSampleTimeSeries = (sample, fitted) => {
    const { ancestors, item, dispatch, runId } = this.props;
    const ancestors_ = [...ancestors, item, {type: SAMPLE_NODE, _id: sample._id}];
    const item_ = {type: TIMESERIE_NODE};
    dispatch(fetchTimeSerie({ancestors: ancestors_, item: item_, runId, fitted}));
  }

  onParamChanged = (...args) => {
    // Either pass one single object with the key/value pairs to update
    // or pass two arguments, (key first, value second)

    let updates;
    if (args.length === 1) {
      updates = args[0];
    } else if (args.length === 2) {
      updates = {[args[0]]: args[1]};
    } else {
      return;
    }

    const props = {...this.props};

    for (let key in updates) {
      if (key in URL_PARAMS) {
        if (this.callbacks[key]) {
          this.callbacks[key](props[key], updates[key]);
        }
        props[key] = updates[key];
      }
    }

    this.updateParams(props);
  }

  updateParams = (props) => {
    const { dispatch, location } = props;
    const searchParams = new URLSearchParams();
    for (let key in URL_PARAMS) {
      const val = URL_PARAMS[key].serialize(props[key]);
      if (val !== null && val !== undefined) {
        searchParams.set(key, val);
      }
    }
    const url = `${location.pathname}?${searchParams.toString()}`;
    dispatch(replace(url));
  }

  render() {
    const {
      samples,
      selectedSamples,
      selectedSampleKeys,
      display,
      scalarField,
      activeMap,
      colorMapRange,
      xAxisS,
      yAxisS,
      yOffsetS,
      yAxisH,
      zAxisH,
      reduceFnH,
      separateSlopeH,
      selectionH,
      fitted
    } = this.props;

    if (samples.length === 0) {
      // return <NotFoundPage />;
      return null;
    }

    return (
      <div>
        <CompositeSamples
          samples={samples}
          scalarField={scalarField}
          activeMap={activeMap}
          colorMapRange={colorMapRange}
          selectedSamples={selectedSamples}
          selectedSampleKeys={selectedSampleKeys}
          onSampleSelect={this.onSampleSelect}
          onSampleDeselect={this.onSampleDeselect}
          onSampleSelectById={this.onSampleSelectById}
          onClearSelection={this.onClearSelection}
          onParamChanged={this.onParamChanged}
        />
        <SamplesDetails
          display={display}
          selectedSamples={selectedSamples}
          onParamChanged={this.onParamChanged}
          xAxisS={xAxisS}
          yAxisS={yAxisS}
          yOffsetS={yOffsetS}
          yAxisH={yAxisH}
          zAxisH={zAxisH}
          reduceFnH={reduceFnH}
          separateSlopeH={separateSlopeH}
          selectionH={selectionH}
          fitted={fitted}
        />
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  const ancestors = parseUrlMatch(ownProps.match);
  const item = ancestors.pop();
  const props = {
    ancestors,
    item
  }
  const searchParams = new URLSearchParams(ownProps.location.search);

  for (let key in URL_PARAMS) {
    props[key] = URL_PARAMS[key].deserialize(searchParams.get(key));
  }

  const samples = getSamples(state, props['platemapId'], props['runId']) || [];
  const selectedSamples = samples.filter(el => props['selectedSampleKeys'].has(el._id));

  props['samples'] = samples;
  props['selectedSamples'] = selectedSamples;
  return props;
}

export default connect(mapStateToProps)(CompositeSamplesContainer);
