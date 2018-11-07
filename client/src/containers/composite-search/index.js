import React, { Component } from 'react';
import { reduxForm, getFormValues } from 'redux-form';
import { connect } from 'react-redux';
import { push } from 'connected-react-router';

import { getCompositeMatches, searchComposite } from '../../redux/ducks/search';
import { createFieldsFactory } from '../../utils/fields';
import { makeUrl } from '../../utils/nodes';
import { COMPOSITE_SEARCH } from '../../utils/search';
import SearchForm from '../../components/search/form';
import SearchResults from '../../components/composite-search/results';

class CompositeSearch extends Component {
  componentDidMount() {
    this.compositeSearch();
  }

  componentDidUpdate(prevProps) {
    const { fields } = this.props;
    const prevFields = prevProps.fields;
    if (JSON.stringify(fields) !== JSON.stringify(prevFields)) {
      this.compositeSearch();
    }
  }

  compositeSearch() {
    const { ancestors, item, fields, dispatch } = this.props;
    dispatch(searchComposite({ancestors, item, fields}));
  }

  onSearch = (values) => {
    const { dispatch, ancestors, item } = this.props;
    const baseUrl = `${makeUrl(ancestors, item)}`;
    const searchParams = new URLSearchParams();
    for (let key in values) {
      let val = values[key].trim();
      if (val.length > 0) {
        searchParams.append(key, values[key]);
      }
    }
    dispatch(push(`${baseUrl}?${searchParams.toString()}`));
  }

  onOpen = (match) => {
    const { ancestors, item, dispatch } = this.props;
    const platemapId = match.platemap._id;
    const runId = match.run._id;
    const searchParams = new URLSearchParams();
    searchParams.append('platemapId', platemapId);
    searchParams.append('runId', runId);
    // dispatch(fetchSamples({ancestors, item, platemapId, runId}));
    const baseUrl = `${makeUrl(ancestors, item)}`;
    dispatch(push(`${baseUrl}/samples?${searchParams.toString()}`));

  }

  render() {
    const {matches} = this.props;
    return (
      <div>
        <SearchForm
          {...this.props}
          fieldsCreator={createFieldsFactory(COMPOSITE_SEARCH)}
          onSubmit={this.onSearch}
        />
        <SearchResults  matches={matches} onOpen={this.onOpen}/>
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  const searchParams = new URLSearchParams(ownProps.location.search);
  let fields = {};
  for (let pair of searchParams.entries()) {
    const [key, value] = pair;
    fields[key] = value;
  }
  return {
    matches: getCompositeMatches(state),
    fields,
    initialValues: fields,
    currentValues: getFormValues('compositeSearch')(state)
  }
}

CompositeSearch = reduxForm({
  form: 'compositeSearch',
  enableReinitialize: true
})(CompositeSearch);

CompositeSearch = connect(mapStateToProps)(CompositeSearch);

export default CompositeSearch;