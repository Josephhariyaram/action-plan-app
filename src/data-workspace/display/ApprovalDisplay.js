import { useDataQuery } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import { NoticeBox, CircularLoader } from '@dhis2/ui'
import PropTypes from 'prop-types'
import React, { useEffect } from 'react'
import { useSelectionContext } from '../../selection-context/index.js'
import { RetryButton } from '../../shared/index.js'
import styles from './display.module.css'
import { Table } from './table.js'

const query = {
    dataSetReport: {
        resource: 'dataSetReport',
        params: ({ dataSetId, periodId, orgUnit }) => ({
            pe: periodId,
            ds: dataSetId,
            ou: orgUnit.id,
        }),
    },
}

const ApprovalDisplay = ({ dataSetId }) => {
    const selection = useSelectionContext()
    const { orgUnit, workflow, period } = selection
    const { dataSets } = workflow
    const selectedDataSet = dataSets.find(({ id }) => id === dataSetId)
    const periodId = period.id

    const { called, fetching, data, error, refetch } = useDataQuery(query, {
        lazy: true,
    })

    const fetchDataSet = () => refetch({ dataSetId, periodId, orgUnit })

    useEffect(() => {
        if (periodId && dataSetId) {
            fetchDataSet()
        }
    }, [periodId, dataSetId])

    if (!dataSets || dataSets.length === 0) {
        return (
            <div className={styles.noData}>
                <p>{i18n.t('This workflow does not contain any data sets.')}</p>
            </div>
        )
    }

    if (!dataSetId) {
        return (
            <div className={styles.chooseDataSet}>
                <h2>{i18n.t('Choose a data set to review')}</h2>
                <p>
                    {i18n.t(
                        '{{- workflowName}} has multiple data sets. Choose a data set from the tabs above.',
                        { workflowName: workflow.displayName }
                    )}
                </p>
            </div>
        )
    }

    if ((!called && periodId) || fetching) {
        return (
            <div className={styles.display}>
                <div className={styles.loadingWrapper}>
                    <CircularLoader small />
                    {i18n.t('Loading data set')}
                </div>
            </div>
        )
    }

    if (error) {
        console.error("Error loading data:", error)
        return (
            <div className={styles.display}>
                <NoticeBox
                    error
                    title={i18n.t('There was a problem displaying this data set')}
                >
                    <p>
                        {i18n.t(`This data set couldn't be loaded or displayed. Try again, or contact your system administrator.`)}
                    </p>
                    <RetryButton onClick={fetchDataSet}>
                        {i18n.t('Retry loading data set')}
                    </RetryButton>
                </NoticeBox>
            </div>
        )
    }

    console.log("API response data:", data)

    if (!periodId || !data?.dataSetReport?.length) {
        return (
            <div className={styles.noData}>
                <p>
                    {i18n.t(`This data set doesn't have any data for {{- period}} in {{- orgUnit}}.`,
                        {
                            period: period.displayName,
                            orgUnit: orgUnit.displayName,
                        })}
                </p>
            </div>
        )
    }

    return (
        <div className={styles.display}>
            {data.dataSetReport.map((table) => (
                <Table
                    key={table.title}
                    title={table.title}
                    columns={table.headers.map(header => header.column)}
                    rows={table.rows.map(row => {
                        const [dataElement, ...values] = row
                        return [
                            dataElement,
                            ...values,
                        ]
                    })}
                />
            ))}
        </div>
    )
}

ApprovalDisplay.propTypes = {
    dataSetId: PropTypes.string,
}

export { ApprovalDisplay }
