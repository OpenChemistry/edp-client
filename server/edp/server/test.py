import cherrypy

from girder.api import access
from girder.api.describe import Description, autoDescribeRoute
from girder.api.rest import Resource, RestException, boundHandler
from girder.constants import AccessType, TokenScope
from girder.models.file import File

from girder.plugins.edp.models.experiment import Experiment as ExperimentModel
from girder.plugins.edp.models.test import Test as TestModel


@boundHandler
@access.user(scope=TokenScope.DATA_WRITE)
@autoDescribeRoute(
    Description('Create a test.')
    .modelParam('experimentId', 'The experiment id associated with this test',
           model=ExperimentModel, destName='experiment',
           level=AccessType.WRITE, paramType='path')
    .jsonParam('test', 'The test', required=True, paramType='body')
)
def create(self, experiment, test):
    self.requireParams(['cellId', 'channel'], test)

    start_date = test.get('startDate')
    cell_id = test.get('cellId')
    channel = test.get('channel')
    comments = test.get('comments')
    public = test.get('public', False)

    test = TestModel().create(experiment, start_date, cell_id,
        channel, comments, self.getCurrentUser(), public)

    cherrypy.response.status = 201
    cherrypy.response.headers['Location'] = '/experiments/%s/tests/%s' % (experiment['_id'], test['_id'])

    return test

@boundHandler
@access.user(scope=TokenScope.DATA_READ)
@autoDescribeRoute(
    Description('Get an test.')
    .modelParam('experimentId', 'The experiment id associated with this test',
        model=ExperimentModel, destName='experiment',
        level=AccessType.READ, paramType='path')
    .modelParam('testId', 'The test id',
        model=TestModel, destName='test',
        level=AccessType.READ, paramType='path')
)
def get(self, experiment, test):
    return test


@boundHandler
@access.user(scope=TokenScope.DATA_READ)
@autoDescribeRoute(
    Description('Find a tests associated with an experiment.')
    .modelParam('experimentId', 'The experiment id associated with this test',
        model=ExperimentModel, destName='experiment',
        level=AccessType.WRITE, paramType='path')
)
def find(self, experiment, offset=0, limit=None, sort=None):
    return list(TestModel().find(experiment, offset=offset, limit=limit, sort=sort,
        user=self.getCurrentUser()))

@boundHandler
@access.user(scope=TokenScope.DATA_WRITE)
@autoDescribeRoute(
    Description('Update a test.')
     .modelParam('experimentId', 'The experiment id associated with this test',
         model=ExperimentModel, destName='experiment',
         level=AccessType.WRITE, paramType='path')
    .modelParam('testId', 'The test id',
        model=TestModel, destName='test',
        level=AccessType.WRITE, paramType='path')
    .jsonParam('updates', 'The test updates', required=True, paramType='body')
)
def update(self, experiment, test, updates):
    test = TestModel().update(test, updates, self.getCurrentUser())
    return test

@boundHandler
@access.user(scope=TokenScope.DATA_WRITE)
@autoDescribeRoute(
    Description('Delete a test.')
     .modelParam('experimentId', 'The experiment id associated with this test',
         model=ExperimentModel, destName='experiment',
         level=AccessType.WRITE, paramType='path')
    .modelParam('testId', 'The test id',
        model=TestModel, destName='test',
        level=AccessType.WRITE, paramType='path')
)
def delete(self, experiment, test):
    TestModel().remove(test, user=self.getCurrentUser())

