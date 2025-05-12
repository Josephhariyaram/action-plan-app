import { useState, useEffect, useCallback } from 'react'
import { useDataQuery } from '@dhis2/app-runtime'

const query = {
    dataValueSets: {
        resource: 'dataValueSets',
        params: ({ dataSetId, periodIds, orgUnitId }) => ({
            dataSet: dataSetId,
            period: periodIds.join(';'),
            orgUnit: orgUnitId,
        }),
    },
}

const useFetchPeriodsData = ({ dataSetId, periods, orgUnitId }) => {
    const [data, setData] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const { refetch } = useDataQuery(query, { lazy: true })

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await refetch({
                dataSetId,
                periodIds: periods,
                orgUnitId,
            })
            setData(response.data.dataValueSets.dataValues)
        } catch (e) {
            setError(e)
        }
        setLoading(false)
    }, [dataSetId, orgUnitId, periods, refetch])

    useEffect(() => {
        if (dataSetId && periods.length && orgUnitId) {
            fetchData()
        }
    }, [dataSetId, periods, orgUnitId, fetchData])

    return { data, loading, error }
}

export default useFetchPeriodsData
