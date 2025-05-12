import { useDataQuery } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import { NoticeBox, CircularLoader } from '@dhis2/ui'
import PropTypes from 'prop-types'
import React, { useEffect } from 'react'
import { useSelectionContext } from '../selection-context/index.js'
import { RetryButton } from '../shared/index.js'
// import styles from './display/'
import { Table } from './display/table.js'

const validationRulesQuery = {
    validationRules: {
        resource: 'validation/dataSet',
        id: ({ dataSetId }) => dataSetId,
        params: ({ periodId, orgUnitId }) => ({
            pe: periodId,
            ou: orgUnitId,
        }),
    },
}

const ValidationRulesDisplay = ({ dataSetId }) => {
    const selection = useSelectionContext()
    const { orgUnit, period } = selection
    const periodId = period.id

    const { called, fetching, data, error, refetch } = useDataQuery(validationRulesQuery, {
        lazy: true,
    })

    const fetchValidationRules = () => refetch({ dataSetId, periodId, orgUnitId: orgUnit.id })

    useEffect(() => {
        if (periodId && dataSetId) {
            fetchValidationRules()
        }
    }, [periodId, dataSetId])

    if ((!called && periodId) || fetching) {
        return (
            <div className={styles.display}>
                <div className={styles.loadingWrapper}>
                    <CircularLoader small />
                    {i18n.t('Loading validation rules')}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={styles.display}>
                <NoticeBox
                    error
                    title={i18n.t('There was a problem displaying validation rules')}
                >
                    <p>
                        {i18n.t('Validation rules could not be loaded or displayed. Try again, or contact your system administrator.')}
                    </p>
                    <RetryButton onClick={fetchValidationRules}>
                        {i18n.t('Retry loading validation rules')}
                    </RetryButton>
                </NoticeBox>
            </div>
        )
    }

    if (!data?.validationRuleViolations?.length) {
        return (
            <div className={styles.noData}>
                <p>
                    {i18n.t(`No validation rules violations for {{- period}} in {{- orgUnit}}.`,
                        {
                            period: period.displayName,
                            orgUnit: orgUnit.displayName,
                        })}
                </p>
            </div>
        )
    }

    const validationRules = data.validationRuleViolations.map(rule => ({
        name: rule.validationRule.displayName,
        leftsideValue: rule.leftsideValue,
        rightsideValue: rule.rightsideValue,
    }))

    return (
        <div className={styles.display}>
            <Table
                title={i18n.t('Validation Rules')}
                columns={['Validation Rule', 'Left Side Value', 'Right Side Value']}
                rows={validationRules.map(rule => [
                    rule.name,
                    rule.leftsideValue,
                    rule.rightsideValue,
                ])}
            />
        </div>
    )
}

ValidationRulesDisplay.propTypes = {
    dataSetId: PropTypes.string,
}

export { ValidationRulesDisplay }
