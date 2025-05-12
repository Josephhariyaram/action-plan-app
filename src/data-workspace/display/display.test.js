import { CustomDataProvider } from '@dhis2/app-runtime'
import {
    render,
    screen,
    waitFor,
    waitForElementToBeRemoved,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { SelectionContext } from '../../selection-context/index.js'
import { Display } from './display.js'

describe('<Display>', () => {
    const dataSetOne = {
        displayName: 'Mortality < 5 years',
        id: 'pBOMPrpg1QX',
        periodType: 'Monthly',
    }

    const dataSetTwo = {
        displayName: 'Mortality > 4 years',
        id: 'pBOMPrpg1QZ',
        periodType: 'Monthly',
    }

    const dataSetThree = {
        displayName: 'Another',
        id: 'custom',
        periodType: 'Monthly',
    }

    it('asks the user to select a data set if none is selected', () => {
        render(
            <CustomDataProvider options={{ loadForever: true }}>
                <SelectionContext.Provider
                    value={{
                        workflow: {
                            dataApprovalLevels: [],
                            dataSets: [dataSetOne, dataSetTwo],
                            displayName: 'Workflow 1',
                            id: 'foo',
                            periodType: 'Monthly',
                        },
                    }}
                >
                    <Display dataSetId={null} />
                </SelectionContext.Provider>
            </CustomDataProvider>
        )

        expect(screen.getByRole('heading')).toHaveTextContent(
            'Choose a data set to review'
        )
        expect(
            screen.getByText(
                `Workflow 1 has multiple data sets. Choose a data set from the tabs above.`
            )
        ).toBeInTheDocument()
    })

    it('shows a message if the workflow has no data sets', () => {
        render(
            <CustomDataProvider options={{ loadForever: true }}>
                <SelectionContext.Provider
                    value={{
                        workflow: {
                            dataApprovalLevels: [],
                            dataSets: [],
                            displayName: 'Workflow 1',
                            id: 'foo',
                            periodType: 'Monthly',
                        },
                    }}
                >
                    <Display dataSetId={null} />
                </SelectionContext.Provider>
            </CustomDataProvider>
        )
        expect(
            screen.getByText(`This workflow does not contain any data sets.`)
        ).toBeInTheDocument()
    })

    it('renders a loading spinner if a data set is selected', () => {
        render(
            <CustomDataProvider options={{ loadForever: true }}>
                <SelectionContext.Provider
                    value={{
                        orgUnit: {
                            id: 'ou-2',
                            path: '/ou-2',
                            displayName: 'Org unit 2',
                        },
                        period: {
                            displayName: 'January 2021',
                            startDate: '2021-01-01',
                            endDate: '2021-01-31',
                            year: 2021,
                            iso: '202101',
                            id: '202101',
                        },
                        workflow: {
                            dataSets: [dataSetOne, dataSetTwo],
                            dataApprovalLevels: [],
                            displayName: 'Workflow 1',
                            periodType: 'Monthly',
                            id: 'foo',
                        },
                    }}
                >
                    <Display dataSetId="pBOMPrpg1QX" />
                </SelectionContext.Provider>
            </CustomDataProvider>
        )

        expect(screen.getByRole('progressbar')).toBeInTheDocument()
        expect(screen.getByText('Loading data set')).toBeInTheDocument()
    })

    it('shows an error notice with a retry button if there was an error fetching the data set report', async () => {
        const data = {}
        render(
            <CustomDataProvider data={data}>
                <SelectionContext.Provider
                    value={{
                        orgUnit: {
                            id: 'ou-2',
                            path: '/ou-2',
                            displayName: 'Org unit 2',
                        },
                        period: {
                            displayName: 'January 2021',
                            startDate: '2021-01-01',
                            endDate: '2021-01-31',
                            year: 2021,
                            iso: '202101',
                            id: '202101',
                        },
                        workflow: {
                            dataSets: [dataSetOne, dataSetTwo],
                            dataApprovalLevels: [],
                            displayName: 'Workflow 1',
                            periodType: 'Monthly',
                            id: 'foo',
                        },
                    }}
                >
                    <Display dataSetId="pBOMPrpg1QX" />
                </SelectionContext.Provider>
            </CustomDataProvider>
        )

        await waitFor(() => screen.getByRole('heading'))

        expect(screen.getByRole('heading')).toHaveTextContent(
            'There was a problem displaying this data set'
        )
        expect(
            screen.getByText(
                `This data set couldn't be loaded or displayed. Try again, or contact your system administrator.`
            )
        ).toBeInTheDocument()
        expect(screen.getByRole('button')).toHaveTextContent(
            'Retry loading data set'
        )

        data.dataSetReport = []
        userEvent.click(screen.getByRole('button', 'Retry loading data set'))
        await waitFor(() => screen.getByRole('progressbar'))

        await waitFor(() => {
            expect(
                screen.queryByRole(
                    'heading',
                    'There was a problem displaying this data set'
                )
            ).not.toBeInTheDocument()
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
        })
    })

    it('shows a message if the data set report has no data for the seleted period and organisation unit', async () => {
        const data = {
            dataSetReport: [],
        }
        render(
            <CustomDataProvider data={data}>
                <SelectionContext.Provider
                    value={{
                        orgUnit: {
                            id: 'ou-2',
                            path: '/ou-2',
                            displayName: 'Org unit 2',
                        },
                        period: {
                            displayName: 'January 2021',
                            startDate: '2021-01-01',
                            endDate: '2021-01-31',
                            year: 2021,
                            iso: '202101',
                            id: '202101',
                        },
                        workflow: {
                            dataSets: [dataSetOne, dataSetTwo],
                            dataApprovalLevels: [],
                            displayName: 'Workflow 1',
                            periodType: 'Monthly',
                            id: 'foo',
                        },
                    }}
                >
                    <Display dataSetId="pBOMPrpg1QX" />
                </SelectionContext.Provider>
            </CustomDataProvider>
        )

        await waitForElementToBeRemoved(() => screen.getByRole('progressbar'))

        expect(
            screen.getByText(
                `This data set doesn't have any data for January 2021 in Org unit 2.`
            )
        ).toBeInTheDocument()
    })

    it('renders one table per data set in the report', async () => {
        const data = {
            dataSetReport: [
                {
                    title: 'Data set 1',
                    headers: [{ name: 'Header 1' }, { name: 'Header 2' }],
                    rows: [],
                },
                {
                    title: 'Data set 2',
                    headers: [{ name: 'Header 1' }, { name: 'Header 2' }],
                    rows: [],
                },
                {
                    title: 'Data set 3',
                    headers: [{ name: 'Header 1' }, { name: 'Header 2' }],
                    rows: [],
                },
            ],
        }
        render(
            <CustomDataProvider data={data}>
                <SelectionContext.Provider
                    value={{
                        orgUnit: {
                            id: 'ou-2',
                            path: '/ou-2',
                            displayName: 'Org unit 2',
                        },
                        period: {
                            displayName: 'January 2021',
                            startDate: '2021-01-01',
                            endDate: '2021-01-31',
                            year: 2021,
                            iso: '202101',
                            id: '202101',
                        },
                        workflow: {
                            dataSets: [dataSetOne, dataSetTwo],
                            dataApprovalLevels: [],
                            displayName: 'Workflow 1',
                            periodType: 'Monthly',
                            id: 'foo',
                        },
                    }}
                >
                    <Display dataSetId="pBOMPrpg1QX" />
                </SelectionContext.Provider>
            </CustomDataProvider>
        )

        await waitForElementToBeRemoved(() => screen.getByRole('progressbar'))

        expect(await screen.findAllByRole('table')).toHaveLength(3)
        expect(
            await screen.queryByText(
                /This data set does not use a default form. The data is displayed as a simple grid below, but this might not be a suitable representation..*/
            )
        ).not.toBeInTheDocument()
    })
})
