import React from 'react'
import { Display } from '../display'

const OutlierComponent = ({ dataSetId }) => {
    return <Display dataSetId={dataSetId} showPreviousPeriods={true} isOutlier={true} />
}

export { OutlierComponent }
