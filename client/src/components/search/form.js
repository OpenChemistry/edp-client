import React, { Component } from 'react';

import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardContent';
import CardContent from '@material-ui/core/CardContent';
import ListItem from '@material-ui/core/ListItem';
import Typography from '@material-ui/core/Typography';

import { renderFormFields } from '../../utils/formGenerator';

class SearchForm extends Component {

  render() {
    const {
      fieldsCreator,
      handleSubmit,
      onSubmit,
      pristine,
      submitting,
      invalid,
      initialValues,
      currentValues,
      liveSearch,
      databases
    } = this.props;

    let fields;
    if (pristine) {
      fields = fieldsCreator(initialValues);
    } else {
      fields = fieldsCreator(currentValues);
    }

    // Insert the options for dataset select box
    fields.dataset.options = databases;

    let formFields = renderFormFields(fields);

    const onChange = liveSearch ? () => {setTimeout(handleSubmit(onSubmit))} : () => {};

    return (
      <div>
        <div style={{paddingBottom: '0.5rem'}}>
          <ListItem>
            <Typography variant='title'>
              Search
            </Typography>
          </ListItem>
        </div>
        <Card elevation={1}>
          <form onSubmit={handleSubmit(onSubmit)} onChange={onChange}>
          <CardContent>
            {formFields}
          </CardContent>
          { !liveSearch &&
          <CardActions >
            <Button
              variant="contained" color="secondary" type='submit'
              disabled={pristine || submitting || invalid}
            >
              Search
            </Button>
          </CardActions>
          }
          </form>
        </Card>
      </div>
    );
  }
}

export default SearchForm;
