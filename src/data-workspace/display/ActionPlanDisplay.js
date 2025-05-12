    import React, { useState, useEffect, useMemo } from 'react';
    import { Line } from 'react-chartjs-2';
    import { CircularLoader, NoticeBox, InputField, Button, Table, TableHead, TableRow, TableCell, TableBody } from '@dhis2/ui';
    import { useSelectionContext } from '../../selection-context/index.js';
    import { useDataQuery, useDataMutation } from '@dhis2/app-runtime';
    import i18n from '@dhis2/d2-i18n';
    import styles from './action-plan-display.module.css';
    import { useWorkflowContext } from '../../workflow-context/index.js';

    const dataElementNames = {
        XmWrhn7gu9W : 'ກະລຸນາຂຽນແຜນປະຕິບັດງານເພື່ອແກ້ໄຂບັນຫາຄວາມຄົບຖ້ວນຂອງຂໍ້ມູນ / Please write down the Action Plan for Completeness',
        obhW9mU4PUy : 'ກະລຸນາຂຽນແຜນປະຕິບັດງານເພື່ອແກ້ໄຂຂໍ້ມູນທີ່ບໍ່ຖືກກັບຫຼັກການກວດສອບຂໍ້ມູນ / Please write down the Action Plan for Validation Rules',
        Pkpa5zTiCtx : 'ກະລຸນາຂຽນແຜນປະຕິບັດງານເພື່ອແກ້ໄຂຄວາມຜິດປົກກະຕິຂອງຂໍ້ມູນ / Please write down the Action Plan for Outlier',
        // DYJX09D1lPL : 'MCH: SBA coverage',
        // r2mLuGSECxs : 'MCH: PNC Coverage (within 2 days)',
        // kFI9NVDVgNf : 'MCH: PNC Coverage (3-42 days)',
    };

    const commentDataElementMapping = {
        XmWrhn7gu9W: 'HJX8DIg3i4K',
        obhW9mU4PUy: 'xqPQvqRc7Hy',
        Pkpa5zTiCtx: 'LF3yANs2NQg',
        // DYJX09D1lPL: 'Wyllnbt4ooz',
        // r2mLuGSECxs: 'SMkeurfuHzv',
        // kFI9NVDVgNf: 'raC52liswtR',
    };

    const dataElementIds = ['HJX8DIg3i4K', 'xqPQvqRc7Hy', 'LF3yANs2NQg', 'Wyllnbt4ooz', 'SMkeurfuHzv', 'raC52liswtR'];

    const getPreviousPeriods = (currentPeriod, numberOfPeriods) => {
        const previousPeriods = [];
        let currentPeriodDate = new Date(currentPeriod);

        for (let i = 0; i < numberOfPeriods; i++) {
            previousPeriods.push(
                `${currentPeriodDate.getFullYear()}${String(currentPeriodDate.getMonth() + 1).padStart(2, '0')}`
            );
            currentPeriodDate.setMonth(currentPeriodDate.getMonth() - 1);
        }

        return previousPeriods.reverse();
    };

    const getPreviousQuarters = (currentPeriod, numberOfQuarters) => {
        const previousQuarters = [];
        let currentPeriodDate = new Date(currentPeriod);

        for (let i = 0; i < numberOfQuarters; i++) {
            const month = currentPeriodDate.getMonth();
            const quarter = Math.floor(month / 3) + 1;
            previousQuarters.push(`${currentPeriodDate.getFullYear()}Q${quarter}`);
            currentPeriodDate.setMonth(currentPeriodDate.getMonth() - 3);
        }

        return previousQuarters.reverse();
    };

    const createAnalyticsQuery = (dataElementId, orgUnitId, periodIds) => ({
        analytics: {
            resource: 'analytics.json',
            params: {
                dimension: [
                    `dx:${dataElementId}`,
                    `ou:${orgUnitId}`,
                    `pe:${periodIds.join(';')}`,
                ],
            },
        },
    });

    const createTableQuery = (dataElementId, orgUnitId, periodId, groupId) => ({
        analytics: {
            resource: 'analytics.json',
            params: {
                dimension: [
                    `dx:${dataElementId}`,
                    `ou:${orgUnitId};OU_GROUP-${groupId}`,
                    `pe:${periodId}`,
                ],
            },
        },
    });

    const saveCommentMutation = {
        resource: 'dataValueSets',
        type: 'create',
        data: ({ dataSet, period, orgUnit, dataValues }) => ({
            dataSet,
            period,
            orgUnit,
            dataValues,
        }),
    };

    const followUpMutation = {
        resource: 'dataValues/followup',
        type: 'update',
        data: ({ dataElement, period, orgUnit, categoryOptionCombo, followup }) => ({
            dataElement,
            period,
            orgUnit,
            categoryOptionCombo,
            followup,
        }),
    };

    const AnalyticsDataFetcher = ({ dataElementId, orgUnitId, periodIds, comment, onCommentChange, onSaveComment }) => {
        const { approvalStatus } = useWorkflowContext();

        return (
            <div>
                <div>
                <div className={styles.commentBox}>
                    {/* <label htmlFor="comment" style={{ display: 'block', fontWeight: 'bold' }}>
                        {i18n.t('Comment')}
                    </label> */}
                    <textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => onCommentChange(dataElementId, e.target.value)}
                        rows={5} // Adjust the height
                        style={{
                            width: '100%', // Full width
                            padding: '10px', // Better spacing
                            borderRadius: '4px', // Rounded corners
                            border: '1px solid #ccc', // Border styling
                            fontSize: '14px', // Text size
                            resize: 'both', // Allow resizing
                        }}
                        disabled={approvalStatus === 'APPROVED_HERE' || approvalStatus === 'APPROVED_ABOVE'}
                    />
                </div>
                    <br />
                    <Button
                        primary
                        onClick={() => onSaveComment(dataElementId, comment)}
                        disabled={approvalStatus === 'APPROVED_HERE' || approvalStatus === 'APPROVED_ABOVE'}
                    >
                        {i18n.t('Save')}
                    </Button>
                </div>
            </div>
        );
    };

import { useDataEngine } from '@dhis2/app-runtime';

const TableDataFetcher = ({ dataElementId, orgUnitId, periodId, groupIds = [] }) => {
    const [statusData, setStatusData] = useState({});
    const [followUpCount, setFollowUpCount] = useState(0);
    const [mutateFollowUp] = useDataMutation(followUpMutation);
    const engine = useDataEngine();

    const query = useMemo(() => {
        const orgUnitsDimension = [
            orgUnitId,
            ...groupIds.map((groupId) => `OU_GROUP-${groupId}`),
        ].join(';');

        return {
            analytics: {
                resource: 'analytics.json',
                params: {
                    dimension: [
                        `dx:${dataElementId}`,
                        `ou:${orgUnitsDimension}`,
                        `pe:${periodId}`,
                    ],
                },
            },
        };
    }, [dataElementId, orgUnitId, periodId, groupIds]);

    const { loading, error, data } = useDataQuery(query);

    // ✅ Refactored follow-up data API call using engine.query
    const fetchFollowUpData = async (orgUnit) => {
        try {
            const result = await engine.query({
                followup: {
                    resource: 'dataAnalysis/followup',
                    params: {
                        fields: 'metadata.de,followupValues',
                        ou: orgUnit,
                        de: dataElementId,
                        pe: periodId,
                    },
                },
            });
            return result.followup;
        } catch (error) {
            console.error('Error fetching follow-up data:', error);
            return null;
        }
    };

    useEffect(() => {
        if (data) {
            const initialStatus = {};
            let count = 0;

            const fetchAllFollowUpData = async () => {
                for (const row of data.analytics.rows) {
                    const orgUnit = row[1];
                    const followUpResult = await fetchFollowUpData(orgUnit);

                    if (followUpResult?.followupValues?.length > 0) {
                        initialStatus[orgUnit] = orgUnit === orgUnitId ? true : 'Completed';
                        count += 1;
                    } else {
                        initialStatus[orgUnit] = orgUnit === orgUnitId ? false : 'Not Completed';
                    }
                }

                setStatusData(initialStatus);
                setFollowUpCount(count);
            };

            fetchAllFollowUpData();
        }
    }, [data]);

    const handleFollowUpChange = async (orgUnit, isChecked, row) => {
        const dataElement = row[0];
        const followup = isChecked;

        setStatusData((prevStatus) => ({
            ...prevStatus,
            [orgUnit]: isChecked,
        }));

        try {
            await mutateFollowUp({
                dataElement,
                period: periodId,
                orgUnit,
                categoryOptionCombo: '',
                followup,
            });
            alert(i18n.t('Status updated successfully'));
        } catch (error) {
            console.error('Error updating follow-up status:', error);
            alert(i18n.t('Failed to update follow-up status'));
        }
    };

    if (loading) return <CircularLoader />;
    if (error)
        return (
            <NoticeBox error title="Error fetching table data">
                {error.message}
            </NoticeBox>
        );

    if (!data || !data.analytics || !data.analytics.rows) {
        return (
            <NoticeBox warning title="No data available">
                No data available for the selected criteria.
            </NoticeBox>
        );
    }

    const { metaData, rows } = data.analytics;

    return (
        <div>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Organisation Unit / ຫົວໜ່ວຍອົງການຈັດຕັ້ງ</TableCell>
                        <TableCell>Action Plan / ແຜນປະຕິບັດງານ</TableCell>
                        <TableCell>Status</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => {
                        const orgUnit = row[1];
                        const status = statusData[orgUnit];
                        const cellStyle = {
                            backgroundColor:
                                status === 'Completed'
                                    ? '#e7ffe5'
                                    : status === 'Not Completed'
                                    ? '#ffc6c6'
                                    : 'transparent',
                        };

                        return (
                            <TableRow key={index}>
                                <TableCell>{metaData.items[orgUnit]?.name || orgUnit}</TableCell>
                                <TableCell>{row[3]}</TableCell>
                                <TableCell style={cellStyle}>
                                    {orgUnit === orgUnitId ? (
                                        <center>
                                            <input
                                                type="checkbox"
                                                checked={status === true}
                                                onChange={(e) => handleFollowUpChange(orgUnit, e.target.checked, row)}
                                            />
                                        </center>
                                    ) : (
                                        <span>{status}</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <br />
            <div style={{ marginTop: '10px', fontWeight: 'bold', color: '#046BD2' }}>
                {i18n.t(
                    'Total organization units with Complete the action plan / ຈຳນວນສະຖານທີ່ບໍລິການທັງໝົດທີ່ສຳເລັດແຜນປະຕິບັດງານ :'
                )}{' '}
                {followUpCount}
            </div>
        </div>
    );
};


    const ActionPlanDisplay = () => {
        const { orgUnit, period } = useSelectionContext();
        const [comments, setComments] = useState({});
        const [mutateComment] = useDataMutation(saveCommentMutation);
        const orgUnitLevel = orgUnit.path.split('/').length - 1;

        const handleCommentChange = (dataElementId, value) => {
            setComments(prevComments => ({
                ...prevComments,
                [dataElementId]: value,
            }));
        };

        const handleSaveComment = async (dataElementId, comment) => {
            const commentDataElementId = commentDataElementMapping[dataElementId];

            if (commentDataElementId) {
                const dataValues = [
                    {
                        dataElement: commentDataElementId,
                        value: comment,
                    },
                ];

                const commentData = {
                    dataSet: 'n9S1kzhcCe0',
                    period: period.id,
                    orgUnit: orgUnit.id,
                    dataValues,
                };

                try {
                    await mutateComment(commentData);
                    alert(i18n.t('Comment saved successfully'));
                } catch (error) {
                    console.error('Failed to save comment:', error);
                    alert(i18n.t('Failed to save comment'));
                }
            }
        };

        const previousPeriods = useMemo(() => {
            return orgUnitLevel === 4
                ? getPreviousQuarters(period.startDate, 6)
                : getPreviousPeriods(period.startDate, 6);
        }, [period.startDate, orgUnitLevel]);

        if (!orgUnit.id || !period.id) {
            return (
                <div className={styles.noData}>
                    <p>{i18n.t('Please select an organisation unit and a period.')}</p>
                </div>
            );
        }

        return (
            <div className={styles.actionPlanContainer}>
                {Object.keys(dataElementNames).map(dataElementId => (
                    <div key={dataElementId} className={orgUnitLevel === 4 ? styles.level4Container : styles.chartTableContainer}>

                        <div className={styles.chartContainer}>
                        <h3>{dataElementNames[dataElementId]}</h3>
                            <AnalyticsDataFetcher
                                dataElementId={dataElementId}
                                orgUnitId={orgUnit.id}
                                periodIds={previousPeriods}
                                comment={comments[dataElementId] || ''}
                                onCommentChange={handleCommentChange}
                                onSaveComment={handleSaveComment}
                            />
                        </div>
                        <div className={styles.tableContainer}>
                        <TableDataFetcher
                            dataElementId={commentDataElementMapping[dataElementId]}
                            orgUnitId={orgUnit.id}
                            periodId={period.id}
                            groupIds={
                                orgUnitLevel === 1
                                    ? ['jblbYwuvO33']
                                    : orgUnitLevel === 2
                                    ? ['Zh1inFu0Z2O','jblbYwuvO33','GiRpQWVJ24q']
                                    : orgUnitLevel === 3
                                    ? ['Zh1inFu0Z2O', 'U53tdte60Ku','Ky8EJEqdpGP','ZcbWJfYaX5n','FMPi37L2q1r']
                                    : ['U53tdte60Ku']
                            }
                        />
                        </div>
                    </div>
                ))}
            </div>
        )
    };

    export { ActionPlanDisplay };
