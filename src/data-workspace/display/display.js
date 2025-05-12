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
        params: ({ dataSetId, periodIds, orgUnit }) => ({
            // arrays are being handled by the app runtime
            pe: periodIds,
            ds: dataSetId,
            ou: orgUnit.id, // Ensure orgUnit.id is correctly passed
        }),
    },
}

const dataValueSetsQuery = {
    dataValueSets: {
        resource: 'dataValueSets',
        params: ({ dataSetId, periodIds, orgUnitId }) => ({
            dataSet: dataSetId,
            period: periodIds.join(','), // Use semicolon to separate periods
            orgUnit: orgUnitId,
        }),
    },
}

const getPreviousPeriods = (period, numberOfPeriods) => {
    const previousPeriods = [];
    let currentPeriod = new Date(period.startDate);

    for (let i = 1; i <= numberOfPeriods; i++) {
        currentPeriod.setMonth(currentPeriod.getMonth() - 1);
        previousPeriods.push({
            id: `${currentPeriod.getFullYear()}${String(currentPeriod.getMonth() + 1).padStart(2, '0')}`,
            displayName: currentPeriod.toDateString(),
        });
    }
    return previousPeriods;
}

const Display = ({ dataSetId, showPreviousPeriods, isOutlier }) => {
    const selection = useSelectionContext();
    const { orgUnit, workflow, period } = selection;
    const { dataSets } = workflow;
    const selectedDataSet = dataSets.find(({ id }) => id === dataSetId);

    const previousPeriods = showPreviousPeriods ? getPreviousPeriods(period, 2) : [];
    const periodIds = [
        ...previousPeriods.map(p => p.id),
        period.id,
    ];

    const queryToUse = isOutlier ? dataValueSetsQuery : query;
    const { called, fetching, data, error, refetch } = useDataQuery(queryToUse, {
        lazy: true,
    });

    const tables = data?.dataSetReport;
    const fetchDataSet = () => {
        if (isOutlier) {
            refetch({ dataSetId, periodIds, orgUnitId: orgUnit.id });
        } else {
            refetch({ dataSetId, periodIds, orgUnit });
        }
    };

    useEffect(() => {
        if (periodIds.length && dataSetId) {
            fetchDataSet();
        }
    }, [periodIds.join(','), dataSetId]);

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

    if ((!called && periodIds.length) || fetching) {
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
        return (
            <div className={styles.display}>
                <NoticeBox
                    error
                    title={i18n.t(
                        'There was a problem displaying this data set'
                    )}
                >
                    <p>
                        {i18n.t(
                            `This data set couldn't be loaded or displayed. Try again, or contact your system administrator.`
                        )}
                    </p>
                    <RetryButton onClick={fetchDataSet}>
                        {i18n.t('Retry loading data set')}
                    </RetryButton>
                </NoticeBox>
            </div>
        )
    }

    if (!periodIds.length || !tables?.length) {
        return (
            <div className={styles.noData}>
                <p>
                    {i18n.t(
                        `This data set doesn't have any data for {{- period}} in {{- orgUnit}}.`,
                        {
                            period: period.displayName,
                            orgUnit: orgUnit.displayName,
                        }
                    )}
                </p>
            </div>
        )
    }

    return (
        <div className={styles.display}>
            {tables.map((table) => (
                <Table
                    key={table.title}
                    title={table.title}
                    columns={['Data Element', 'Selected Period', ...previousPeriods.map(p => p.displayName)]}
                    rows={table.rows.map(row => {
                        const [dataElement, ...values] = row;
                        return [
                            dataElement,
                            ...values, // Add values for the selected period
                            ...previousPeriods.map(p => values[0]), // Placeholder logic
                        ];
                    })}
                />
            ))}
        </div>
    )
}

Display.propTypes = {
    dataSetId: PropTypes.string,
    showPreviousPeriods: PropTypes.bool,
    isOutlier: PropTypes.bool,
}

export { Display }
