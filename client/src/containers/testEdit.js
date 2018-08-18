import React, { Component } from 'react';

import { connect } from 'react-redux';
import { push } from 'connected-react-router';

import { createTestFields } from '../utils/fields';
import { fetchExperiment } from '../redux/ducks/experiments';
import { getTest, createTest, updateTest } from '../redux/ducks/tests';
import { getExperiment } from '../redux/ducks/experiments';

import { EXPERIMENT_VIEW_ROUTE, TEST_VIEW_ROUTE } from '../routes';

import TestEdit from '../components/testEdit';
import NotFoundPage from '../components/notFound.js';

class TestEditContainer extends Component {
  
  onSubmit = (test) => {
    let actionCreator = this.props.create ? createTest : updateTest;
    test.experimentId = this.props.experiment.id;

    if (test.metadataFile && test.metadataFile[0]) {
      test.metadataFile = test.metadataFile[0].name;
    }

    if (test.dataFile && test.dataFile[0]) {
      test.dataFile = test.dataFile[0].name;
    }

    let onSubmitPromise = new Promise((resolve, reject) => {
      this.props.dispatch(actionCreator({test, resolve, reject}));
    });

    onSubmitPromise
    .then((val) => {
      this.props.dispatch(fetchExperiment({id: this.props.experiment.id}));
      if (this.props.create) {
        this.props.dispatch(push(`/${EXPERIMENT_VIEW_ROUTE}/${val.experimentId}`));
      } else {
        this.props.dispatch(push(`/${EXPERIMENT_VIEW_ROUTE}/${val.experimentId}/${TEST_VIEW_ROUTE}/${val.id}`));
      }
    })
    .catch((err) =>{
    });

    return onSubmitPromise;
  }

  render() {
    
    if (!this.props.create && !this.props.test) {
      return (
        <NotFoundPage />
      );
    }

    return (
      <TestEdit
        create={this.props.create}
        fields={createTestFields(this.props.test)}
        initialValues={this.props.test}
        onSubmit={this.onSubmit}
      />
    );
  }
}

function mapStateToProps(state, ownProps) {
  let create = ownProps.match.params.action === 'addtest';
  let test;
  let experiment = getExperiment(state, ownProps.match.params.experimentId);
  if (!create) {
    let testId = ownProps.match.params.testId;
    test = getTest(state, testId);
    if (!experiment) {
      test = null;
    } else if ( test && test.experimentId !== experiment.id) {
      test = null;
    }
  }
  return {
    create,
    test,
    experiment
  }
}

export default connect(mapStateToProps)(TestEditContainer);