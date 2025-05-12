import React, { useMemo, useEffect, useState } from 'react';
import {
    CircularLoader,
    NoticeBox,
} from '@dhis2/ui';
import { useDataQuery, useDataEngine } from '@dhis2/app-runtime';
import { useSelectionContext } from '../../selection-context/index.js';
import { DATA_ELEMENTS } from '../../const2.js';
import styles from './completeness-display.module.css';

const createAnalyticsQuery = (orgUnitLevel, dataElementIds, orgUnitId, periodIds) => {
    const orgUnitGroups = {
        1: 'OU_GROUP-wgNfjQ4f6Sk;OU_GROUP-jblbYwuvO33',
        2: 'OU_GROUP-Zh1inFu0Z2O;OU_GROUP-GiRpQWVJ24q;OU_GROUP-jblbYwuvO33;',
        3: 'OU_GROUP-U53tdte60Ku;OU_GROUP-S8nZUO4pUE8;OU_GROUP-GiRpQWVJ24q;OU_GROUP-gHfSdwPrC83;OU_GROUP-VePuVPFoyJ2;OU_GROUP-FMPi37L2q1r;OU_GROUP-D3WBiIjOENI;',
    };

    return {
        analytics: {
            resource: 'analytics.json',
            params: {
                dimension: [
                    `dx:${dataElementIds.join(';')}`,
                    `ou:${orgUnitId}${orgUnitGroups[orgUnitLevel] ? `;${orgUnitGroups[orgUnitLevel]}` : ''}`,
                    `pe:${periodIds.join(';')}`,
                ],
            },
        },
    };
};

const createCompletenessQuery = (orgUnitLevel, orgUnitId, periodIds) => {
    const orgUnitGroupMap = {
        1: 'OU_GROUP-U53tdte60Ku;OU_GROUP-S8nZUO4pUE8;OU_GROUP-VePuVPFoyJ2',
        2: 'OU_GROUP-U53tdte60Ku;OU_GROUP-S8nZUO4pUE8;OU_GROUP-VePuVPFoyJ2;OU_GROUP-GiRpQWVJ24q;',
        3: 'OU_GROUP-U53tdte60Ku;OU_GROUP-S8nZUO4pUE8;OU_GROUP-GiRpQWVJ24q;OU_GROUP-gHfSdwPrC83;OU_GROUP-VePuVPFoyJ2;OU_GROUP-FMPi37L2q1r;OU_GROUP-D3WBiIjOENI;',
    };
    const orgUnitGroup = orgUnitGroupMap[orgUnitLevel] || '';

    return {
        completenessAnalytics: {
            resource: 'analytics.json',
            params: {
                dimension: [
                    `dx:${DATA_ELEMENTS.join(';')}`,
                    `ou:${orgUnitId};${orgUnitGroup}`,
                    `pe:${periodIds.join(';')}`,
                ],
            },
        },
    };
};

const CompletenessDisplay = () => {
    const { orgUnit, period } = useSelectionContext();
    const orgUnitPath = orgUnit.path.split('/');
    const orgUnitLevel = orgUnitPath.length - 1 || undefined;
    const engine = useDataEngine();
    const [childOrgUnits, setChildOrgUnits] = useState([]);
    const [approvalStatuses, setApprovalStatuses] = useState({});
    const [completenessData, setCompletenessData] = useState([]);
    const [orgUnitNames, setOrgUnitNames] = useState({});
    const [tableData, setTableData] = useState({});
    const [totalExpectedReports, setTotalExpectedReports] = useState(0);

    useEffect(() => {
        const fetchChildOrgUnits = async () => {
            const response = await engine.query({
                units: {
                    resource: `organisationUnits/${orgUnit.id}`,
                    params: {
                        fields: 'children[id,name,attributeValues[attribute[id,code],value]]'
                    },
                },
            });
            const childUnits = response.units.children;
            const orgUnitsMap = childUnits.reduce((acc, unit) => {
                acc[unit.id] = unit.name;
                return acc;
            }, { [orgUnit.id]: orgUnit.name });

            setChildOrgUnits(childUnits.map(child => child.id));
            setOrgUnitNames(orgUnitsMap);
        };

        fetchChildOrgUnits();
    }, [orgUnit.id, orgUnit.name, engine]);

    useEffect(() => {
        const fetchApprovalStatuses = async () => {
            if (childOrgUnits.length > 0) {
                const orgUnitsQuery = `${orgUnit.id},${childOrgUnits.join(',')}`;
                const approvalQuery = {
                    approvals: {
                        resource: 'dataApprovals/approvals',
                        params: {
                            wf: 'stfYnMHvmta',
                            pe: period.id,
                            ou: orgUnitsQuery,
                        },
                    },
                };

                const response = await engine.query(approvalQuery);
                const approvalMap = response.approvals.reduce((acc, approval) => {
                    acc[approval.ou] = approval.state === 'UNAPPROVED_READY'
                        ? 'Not Approved'
                        : approval.state === 'UNAPPROVED_WAITING'
                            ? 'Waiting lower-level approval'
                            : approval.state === 'APPROVED_HERE' || approval.state === 'APPROVED_ABOVE'
                                ? 'Approved'
                                : 'N/A';
                    return acc;
                }, {});
                setApprovalStatuses(approvalMap);
            }
        };

        fetchApprovalStatuses();
    }, [childOrgUnits, period.id, orgUnit.id, engine]);

    const previousPeriods = useMemo(() => {
        const currentPeriodDate = new Date(period.startDate);
        return Array.from({ length: 1 }, (_, i) => {
            const d = new Date(currentPeriodDate);
            d.setMonth(d.getMonth() - i);
            return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
        }).reverse();
    }, [period.startDate]);

    const datasetCompletenessQuery = useMemo(() =>
        createAnalyticsQuery(orgUnitLevel, ['w8XQmI94Spv.REPORTING_RATE', 'w8XQmI94Spv.REPORTING_RATE_ON_TIME', 'w8XQmI94Spv.EXPECTED_REPORTS'], orgUnit.id, previousPeriods),
        [orgUnitLevel, orgUnit.id, previousPeriods]
    );

    const dataElementCompletenessQuery = useMemo(() =>
        createCompletenessQuery(orgUnitLevel, orgUnit.id, previousPeriods),
        [orgUnitLevel, orgUnit.id, previousPeriods]
    );

    const { loading, error, data } = useDataQuery(datasetCompletenessQuery);
    const { loading: completenessLoading, error: completenessError, data: completenessDataResponse } = useDataQuery(dataElementCompletenessQuery);
    useEffect(() => {
        if (data) {
            const { rows, metaData } = data.analytics;
            const table = rows.reduce((acc, row) => {
                const [dx, ou, pe, value] = row;
                if (!acc[ou]) {
                    acc[ou] = { orgUnitId: ou, periods: {}, approvalStatuses: {} };
                }

                const periodName = metaData.items[pe]?.name || pe;
                const dataElementName = metaData.items[dx]?.name || dx;

                if (!acc[ou].periods[periodName]) {
                    acc[ou].periods[periodName] = {};
                }

                acc[ou].periods[periodName][dataElementName] = value;
                acc[ou].approvalStatuses[periodName] = approvalStatuses[ou] || 'N/A';

                return acc;
            }, {});
            setTableData(table);

            const totalReports = rows
                .filter(([dx, ou, pe]) =>
                    dx === 'w8XQmI94Spv.EXPECTED_REPORTS' &&
                    ou === orgUnit.id &&
                    pe === previousPeriods[0]
                )
                .reduce((sum, [, , , value]) => sum + parseFloat(value), 0);

            setTotalExpectedReports(totalReports);
        }
    }, [data, approvalStatuses, orgUnit.id, previousPeriods]);

    useEffect(() => {
        if (completenessDataResponse) {
            const completenessCountMap = completenessDataResponse.completenessAnalytics.rows.reduce((acc, row) => {
                const [dataElementId, orgUnitId, , value] = row;
                if (!acc[dataElementId]) {
                    acc[dataElementId] = {
                        name: completenessDataResponse.completenessAnalytics.metaData.items[dataElementId]?.name || 'Unknown',
                        values: {},
                    };
                }
                acc[dataElementId].values[orgUnitId] = (acc[dataElementId].values[orgUnitId] || 0) + (value ? 1 : 0);
                return acc;
            }, {});
            setCompletenessData(completenessCountMap);
        }
    }, [completenessDataResponse]);

    if (loading || completenessLoading) return <CircularLoader />;
    if (error) return <NoticeBox error title="Error fetching dataset completeness">{error.message}</NoticeBox>;
    if (completenessError) return <NoticeBox error title="Error fetching data element completeness">{completenessError.message}</NoticeBox>;

    const parsePeriod = (period) => {
        const [monthName, year] = period.split(' ');
        const months = {
            January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
            July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
        };
        return new Date(parseInt(year), months[monthName]);
    };

    const periods = Object.keys(tableData).length > 0
        ? Object.keys(tableData[Object.keys(tableData)[0]].periods).sort((a, b) => parsePeriod(a) - parsePeriod(b))
        : [];

    const reportingRateOrgUnitIds = Object.keys(tableData);

    const getApprovalStatusStyle = (status) => {
        const styles = {
            'Approved': { backgroundColor: '#d5ffd1' },
            'Not Approved': { backgroundColor: '#ffdcdc' },
            'Waiting lower-level approval': { backgroundColor: '#fff6dd' },
        };
        return styles[status] || {};
    };

    const getCellStyle = (value) => {
        if (value == 100) return { backgroundColor: '#e7ffe5' };
        if (value >= 90) return { backgroundColor: '#ffdec6' };
        if (value >= 0) return { backgroundColor: '#ffc6c6' };
        return {};
    };

    return (
        <div className={styles.container}>
            {/* Data Set Completeness Table */}
            <div className={styles.tableContainer}>
                <div className={styles.headerContainer}>
                    <h3 className={styles.title}>Data Set Completeness</h3>
                    <div className={styles.keyContainer}>
                        <div className={styles.keyItem}>
                            <div className={styles.keyBox} style={{ backgroundColor: '#f2ffe5' }}></div>
                            <span>100%</span>
                        </div>
                        <div className={styles.keyItem}>
                            <div className={styles.keyBox} style={{ backgroundColor: '#ffc4a4' }}></div>
                            <span>90-99%</span>
                        </div>
                        <div className={styles.keyItem}>
                            <div className={styles.keyBox} style={{ backgroundColor: '#feafa3' }}></div>
                            <span>0-90%</span>
                        </div>
                    </div>
                </div>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th rowSpan="2" className={styles.leftAlign}>Organisation Unit</th>
                            <th className={styles.rightAlign} colSpan={periods.length}>Reporting Rate/ອັດຕາກາາລາຍງານ</th>
                            <th className={styles.rightAlign} colSpan={periods.length}>Reporting Rate On Time/ອັດຕາການລາຍງານທັນເວລາ</th>
                            {orgUnitLevel !== 4 && <th className={styles.rightAlign} rowSpan="2">Approval Status/ສະຖານະການອະນຸມັດ</th>}
                        </tr>
                        <tr>
                            {periods.map(period => (
                                <th key={`${period}-rate`}>{period}</th>
                            ))}
                            {periods.map(period => (
                                <th key={`${period}-ontime`}>{period}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {reportingRateOrgUnitIds.map(ou => {
                            const row = tableData[ou];
                            return (
                                <tr key={ou}>
                                    <td className={styles.leftAlign}>{orgUnitNames[ou] || ou}</td>
                                    {periods.map(period => (
                                        <td key={`${ou}-${period}-rate`} style={getCellStyle(row.periods[period]?.['MCH Version 2.1 - Reporting rate'])} className={styles.centeredCell}>
                                            {Number(row.periods[period]?.['MCH Version 2.1 - Reporting rate'] || 0).toFixed(1)}
                                        </td>
                                    ))}
                                    {periods.map(period => (
                                        <td key={`${ou}-${period}-ontime`} style={getCellStyle(row.periods[period]?.['MCH Version 2.1 - Reporting rate on time'])} className={styles.centeredCell}>
                                            {Number(row.periods[period]?.['MCH Version 2.1 - Reporting rate on time'] || 0).toFixed(1)}
                                        </td>
                                    ))}
                                    {orgUnitLevel !== 4 && (
                                        <td style={getApprovalStatusStyle(row.approvalStatuses[periods[0]])} className={styles.centeredCell}>
                                            {row.approvalStatuses[periods[0]]}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Data Element Completeness Table */}
            <div className={styles.tableContainer}>
                <h3>Data Element Completeness / ຄວາມຄົບຖ້ວນຂອງອົງປະກອບຂໍ້ມູນ</h3>
                {orgUnitLevel === 3 ? (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Data Element Name</th>
                                {reportingRateOrgUnitIds.map(orgUnitId => (
                                    <th key={orgUnitId}>{orgUnitNames[orgUnitId] || orgUnitId}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(completenessData).map(([dataElementId, dataElement]) => (
                                <tr key={dataElementId}>
                                    <td>{dataElement.name}</td>
                                    {reportingRateOrgUnitIds.map(orgUnitId => (
                                        <td key={`${dataElementId}-${orgUnitId}`}>
                                            {(Math.round(dataElement.values[orgUnitId] || 0) / 6 * 100).toFixed(1)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Data Element Name</th>
                                <th>Completeness (Available Data Points)</th>
                                <th>Completeness (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(completenessData).map(([dataElementId, dataElement]) => {
                                const total = Object.values(dataElement.values).reduce((a, b) => a + b, 0);
                                return (
                                    <tr key={dataElementId}>
                                        <td>{dataElement.name}</td>
                                        <td>{total}</td>
                                        <td>{totalExpectedReports > 0 ? Math.round((total / totalExpectedReports) * 100) : 'N/A'}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export { CompletenessDisplay };
