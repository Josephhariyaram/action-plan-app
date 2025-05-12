import { useState, useEffect } from 'react'
import { useDataQuery } from '@dhis2/app-runtime'

const query = {
    dataValueSets: {
        resource: 'dataValueSets',
        params: ({ dataSetId, period, orgUnitId }) => ({
            dataSet: dataSetId,
            period: period,
            orgUnit: orgUnitId,
        }),
    },
}

const useFetchPeriodData = ({ dataSetId, period, orgUnitId }) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const { refetch } = useDataQuery(query, { lazy: true })

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            setError(null)
            try {
                const response = await refetch({
                    dataSetId,
                    period,
                    orgUnitId,
                })
                setData(response.data.dataValueSets)
            } catch (e) {
                setError(e)
            }
            setLoading(false)
        }

        if (dataSetId && period && orgUnitId) {
            fetchData()
        }
    }, [dataSetId, period, orgUnitId, refetch])

    return { data, loading, error }
}

export default useFetchPeriodData
