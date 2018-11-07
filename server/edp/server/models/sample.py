from .base import Base
from bson.objectid import ObjectId


class Sample(Base):

    def __init__(self):
        from girder.plugins.edp.models.composite import Composite
        from girder.plugins.edp.models.timeseries import TimeSeries
        super(Sample, self).__init__(
            name='edp.samples',
            props=(
                {
                    'name': 'runId',
                    'expose': True,
                    'create': True,
                    'mutable': False,
                    'ensure_index': True,
                    'query': {
                        'selector': '$eq'
                     },
                    'type': ObjectId
                },
                {
                    'name': 'sampleNum',
                    'expose': True,
                    'create': True,
                    'mutable': False,
                    'ensure_index': True
                },
                {
                    'name': 'composition',
                    'expose': True,
                    'create': True,
                    'mutable': False
                },
                {
                    'name': 'scalars',
                    'expose': True,
                    'create': True,
                    'mutable': False
                }
            ),
            paging_key='sampleId',
            parent_model=Composite,
            child_model=TimeSeries,
            url='samples'
        )