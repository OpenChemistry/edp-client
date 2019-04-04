import React, { Component, Fragment } from 'react';

import { connect } from 'react-redux';
import { replace } from 'connected-react-router';

import { produce } from 'immer';

import { TIMESERIE_NODE, SAMPLE_NODE } from '../../nodes/sow8/hierarchy';

import { getSamples, fetchSamples, fetchTimeSerie } from '../../redux/ducks/composites';

import { parseUrlMatch } from '../../nodes';
import SamplesDetails from './details';

import QuaternaryPlotComponent from '../../components/composite-samples/quaternary-plot';

import NotFoundPage from '../../components/notFound.js';
import { colors } from 'composition-plot';
import { redWhiteBlue } from 'composition-plot/dist/utils/colors';
import { NearestCompositionToPositionProvider, AnaliticalCompositionToPositionProvider } from 'composition-plot';
import { isNil } from 'lodash-es';
import ModelMetricsComponent from '../../components/composite-samples/model-metrics';
import CompositeControlComponent from '../../components/composite-samples/controls';
import MultidimensionPlotComponent from '../../components/composite-samples/multidimension-plot';

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
  filterRange: {
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
  plots: {
    serialize: defaultWrapper(identity, null),
    deserialize: defaultWrapper(identity, 'raw'),
    callback: function(currValue, nextValue) {
      const { selectedSampleKeys } = this.props;
      for (let _id of selectedSampleKeys.values()) {
        this.fetchSampleTimeSeries({_id}, nextValue);
      }
    }
  },
  detailsPanel: {
    serialize: defaultWrapper(identity, null),
    deserialize: defaultWrapper(identity, 'details'),
    callback: function(currValue, nextValue) {
      if (nextValue === 'details') {
        return;
      }

      const { mlModels } = this.state;

      const model = mlModels[nextValue];
      const mlModelIteration = model.nIterations - 1;

      // If we already fetched the requested ML Model, do nothing
      if (this.state.mlModels[nextValue].samples[mlModelIteration]) {
        return;
      }

      this.fetchMachineLearningModel(nextValue);

      setTimeout(() => {this.onParamChanged('mlModelIteration', mlModelIteration);}, 100);
    }
  },
  mlModelIteration: {
    serialize: defaultWrapper(numberSerialize, null),
    deserialize: defaultWrapper(numberDeserialize, 0),
    callback: function(currValue, nextValue) {
      const mlModel = this.props.detailsPanel;
      if (mlModel === 'details') {
        return;
      }

      if (this.state.mlModels[mlModel].samples[nextValue]) {
        return;
      }
      // this.fetchMachineLearningModel(mlModel, nextValue);
    }
  },
  mlModelMetric: {
    serialize: defaultWrapper(identity, null),
    deserialize: defaultWrapper(identity, 'MAE')
  }
}

class CompositeSamplesContainer extends Component {

  constructor(props) {
    super(props);

    this.state = {
      quatCompositionToPosition: new AnaliticalCompositionToPositionProvider(),
      octCompositionToPosition: null,
      mlModels: {
        'Model 1': {
          nIterations: 50,
          samples: {},
          samplesCompare: {},
          metrics: {}
        },
        'Model 2': {
          nIterations: 50,
          samples: {},
          samplesCompare: {},
          metrics: {}
        },
        'Model 3': {
          nIterations: 50,
          samples: {},
          samplesCompare: {},
          metrics: {}
        },
        'Model 4': {
          nIterations: 50,
          samples: {},
          samplesCompare: {},
          metrics: {}
        },
      },
      scalarFields: [],
      dataRange: [0, 1]
    }

    this.colorMaps = {
      'Viridis': colors.viridis,
      'Plasma': colors.plasma,
      'Red White Blue': colors.redWhiteBlue,
      'Green Blue': [[0, 1, 0], [0, 0, 1]],
    }
  }

  componentDidMount() {
    const { dispatch, ancestors, item, platemapId, runId, selectedSampleKeys, plots } = this.props;
    dispatch(fetchSamples({ancestors, item, platemapId, runId}));
    for (let _id of selectedSampleKeys.values()) {
      this.fetchSampleTimeSeries({_id}, plots);
    }

    fetch('/8dcomp2xyz.json')
    .then(res => res.json())
    .then(data => {this.updateCompositionToPosition(data);})
    .catch(e=> console.log('ERRRR', e));
  }

  updateCompositionToPosition(data) {
    let compositionToPosition = null;

    if (Array.isArray(data)) {
      compositionToPosition = new NearestCompositionToPositionProvider();
      compositionToPosition.setData(8, 10, data, false);
    }

    this.setState(state => {
      state.octCompositionToPosition = compositionToPosition;
      return state;
    });
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
    const { plots } = this.props;
    this.fetchSampleTimeSeries(sample, plots);
    const selectedSampleKeys = new Set(this.props['selectedSampleKeys']);
    selectedSampleKeys.add(sample._id);
    this.onParamChanged('selectedSampleKeys', selectedSampleKeys);
  }

  onSampleDeselect = (sample) => {
    const selectedSampleKeys = new Set(this.props['selectedSampleKeys']);
    selectedSampleKeys.delete(sample._id);
    this.onParamChanged('selectedSampleKeys', selectedSampleKeys);
  }

  fetchSampleTimeSeries = (sample, plots) => {
    const { ancestors, item, dispatch, runId } = this.props;
    const ancestors_ = [...ancestors, item, {type: SAMPLE_NODE, _id: sample._id}];
    const item_ = {type: TIMESERIE_NODE};
    const fetchRaw = plots.includes('raw');
    const fetchFitted = plots.includes('fitted');
    if (fetchRaw) {
      dispatch(fetchTimeSerie({ancestors: ancestors_, item: item_, runId, fitted: false}));
    }
    if (fetchFitted) {
      dispatch(fetchTimeSerie({ancestors: ancestors_, item: item_, runId, fitted: true}));
    }
  }

  fetchMachineLearningModel = (modelName) => {
    const {samples} = this.props;

    const model = this.state.mlModels[modelName];

    for (let modelIteration = 0; modelIteration < model.nIterations; ++modelIteration) {
      const delta = 40 * (1 - (0.7 + Math.random() * 0.3)  * (modelIteration / model.nIterations));

      let modelSamples = [];
      let modelCompareSamples = [];

      for (let i in samples) {
        let sample = samples[i];
        let modelSample = {...sample};
        modelSample.scalars = Object.entries(sample.scalars)
          .map((val) => {
            let [key, value] = val;
            return [key, value - delta / 2 + Math.random() * delta];
          })
          .reduce((accumulator, curr) => {
            return {...accumulator, [curr[0]]: curr[1]};
          }, {});
        modelSamples.push(modelSample);
      }

      for (let i in samples) {
        let sample = samples[i];
        let modelCompareSample = {...sample};
        modelCompareSample.scalars = Object.entries(sample.scalars)
          .map((val) => {
            let [key, value] = val;
            return [key, modelSamples[i].scalars[key] - value];
          })
          .reduce((accumulator, curr) => {
            return {...accumulator, [curr[0]]: curr[1]};
          }, {});
        modelCompareSamples.push(modelCompareSample);
      }

      const metrics = this.calculateMetrics(samples, modelSamples);

      this.setState((state) => {
        return produce(state, (draft) => {
          draft.mlModels[modelName].samples[modelIteration] = modelSamples;
          draft.mlModels[modelName].samplesCompare[modelIteration] = modelCompareSamples;
          draft.mlModels[modelName].metrics[modelIteration] = metrics;
        });
      });

    }
  }

  calculateMetrics = (samples, modelSamples) => {
    const metrics = {
      'MAE': {},
      'RMSE': {}
    };

    const n = samples.length;

    for (let i in samples) {
      let sample = samples[i];
      let modelSample = modelSamples[i];
      for (let scalar in sample.scalars) {
        if (isNil(metrics['MAE'][scalar])) {
          metrics['MAE'][scalar] = 0;
          metrics['RMSE'][scalar] = 0;
        }
        const diff = sample.scalars[scalar] - modelSample.scalars[scalar];
        metrics['MAE'][scalar] += Math.abs(diff);
        metrics['RMSE'][scalar] += diff * diff;
      }
    }

    for (let scalar in metrics['MAE']) {
      metrics['MAE'][scalar] /= n;
    }

    for (let scalar in metrics['RMSE']) {
      metrics['RMSE'][scalar] = Math.sqrt(metrics['RMSE'][scalar] / n);
    }

    return metrics;
  }

  onStateParamChanged = (...args) => {
    let updates;
    if (args.length === 1) {
      updates = args[0];
    } else if (args.length === 2) {
      updates = {[args[0]]: args[1]};
    } else {
      return;
    }

    this.setState(state => {
      for (let key in updates) {
        if (key in state) {
          state[key] = updates[key];
        }
      }
      return state;
    });  
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
        if (URL_PARAMS[key].callback) {
          URL_PARAMS[key].callback.call(this, props[key], updates[key]);
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
      filterRange,
      xAxisS,
      yAxisS,
      yOffsetS,
      yAxisH,
      zAxisH,
      reduceFnH,
      separateSlopeH,
      selectionH,
      plots,
      selectionPanel,
      detailsPanel,
      mlModelIteration,
      mlModelMetric
    } = this.props;

    const {
      quatCompositionToPosition,
      octCompositionToPosition,
      mlModels,
      scalarFields,
      dataRange
    } = this.state;

    if (samples.length === 0) {
      // return <NotFoundPage />;
      return null;
    }

    return (
      <div>
        <CompositeControlComponent
          scalarField={scalarField}
          scalarFields={scalarFields}
          dataRange={dataRange}
          activeMap={activeMap}
          colorMaps={this.colorMaps}
          colorMapRange={colorMapRange}
          filterRange={filterRange}
          selectedSamples={selectedSamples}
          selectedSampleKeys={selectedSampleKeys}
          selectionPanel={selectionPanel}
          detailsPanel={detailsPanel}
          mlModels={Object.keys(mlModels)}
          mlModelIteration={mlModelIteration}
          nMlModelIteration={mlModels[detailsPanel] ? mlModels[detailsPanel].nIterations -1 : 1}
          mlModelMetric={mlModelMetric}
          mlModelMetrics={mlModels[detailsPanel] && mlModels[detailsPanel].metrics[mlModelIteration] ? Object.keys(mlModels[detailsPanel].metrics[mlModelIteration]) : []}
          onSampleSelect={this.onSampleSelect}
          onSampleDeselect={this.onSampleDeselect}
          onSampleSelectById={this.onSampleSelectById}
          onClearSelection={this.onClearSelection}
          onParamChanged={this.onParamChanged}
        >
          <QuaternaryPlotComponent
            ref={(ref) => {this.quaternaryPlot = ref;}}
            samples={samples}
            scalarField={scalarField}
            colorMaps={this.colorMaps}
            activeMap={activeMap}
            colorMapRange={colorMapRange}
            selectedSampleKeys={selectedSampleKeys}
            onParamChanged={this.onParamChanged}
            onStateParamChanged={this.onStateParamChanged}
            onSampleSelect={this.onSampleSelect}
            onSampleDeselect={this.onSampleDeselect}
          />

          {octCompositionToPosition &&
          <MultidimensionPlotComponent
            samples={samples}
            compositionToPosition={octCompositionToPosition}
            scalarField={scalarField}
            colorMaps={this.colorMaps}
            activeMap={activeMap}
            colorMapRange={colorMapRange}
            filterRange={filterRange}
            onParamChanged={this.onParamChanged}
          />
          }

          <MultidimensionPlotComponent
            samples={samples}
            compositionToPosition={quatCompositionToPosition}
            scalarField={scalarField}
            colorMaps={this.colorMaps}
            activeMap={activeMap}
            colorMapRange={colorMapRange}
            filterRange={filterRange}
            onParamChanged={this.onParamChanged}
          />
        </CompositeControlComponent>

        {detailsPanel === 'details' &&
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
          plots={plots}
        />
        }

        {detailsPanel !== 'details' &&
        <Fragment>
          {mlModels[detailsPanel].metrics &&
          <ModelMetricsComponent
            metrics={mlModels[detailsPanel].metrics}
            mlModelMetric={mlModelMetric}
            scalarField={scalarField}
            nIterations={mlModels[detailsPanel] ? mlModels[detailsPanel].nIterations : 1}
            onParamChanged={this.onParamChanged}
          />
          }
          {mlModels[detailsPanel].samples[mlModelIteration] &&
          <QuaternaryPlotComponent
            samples={mlModels[detailsPanel].samples[mlModelIteration]}
            scalarField={scalarField}
            activeMap={activeMap}
            colorMapRange={colorMapRange}
            selectedSampleKeys={new Set()}
            onParamChanged={() => {}}
            onSampleSelect={() => {}}
            onSampleDeselect={() => {}}
          />
          }

          {mlModels[detailsPanel].samplesCompare[mlModelIteration] &&
          <QuaternaryPlotComponent
            samples={mlModels[detailsPanel].samplesCompare[mlModelIteration]}
            scalarField={scalarField}
            activeMap={redWhiteBlue}
            colorMapRange={[-20, 20]}
            selectedSampleKeys={new Set()}
            onParamChanged={() => {}}
            onSampleSelect={() => {}}
            onSampleDeselect={() => {}}
          />
          }
        </Fragment>
        }
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
