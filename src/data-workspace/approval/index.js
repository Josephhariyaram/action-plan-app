import React from 'react'
import { Display } from '../display'

const ApprovalComponent = ({ dataSetId }) => {
    return <Display dataSetId={dataSetId} showPreviousPeriods={true} isOutlier={false} />
}

export { ApprovalComponent }
