import { useDataQuery, useDataMutation } from '@dhis2/app-runtime';
import i18n from '@dhis2/d2-i18n';
import {
    NoticeBox, CircularLoader, Button, Modal, ModalTitle, ModalContent, ModalActions, InputField, DropdownButton, Menu, MenuItem
} from '@dhis2/ui';
import PropTypes from 'prop-types';
import React, { useState, useEffect, useMemo } from 'react';
import { useSelectionContext } from '../../selection-context/index.js';
import { RetryButton } from '../../shared/index.js';
import styles from './display.module.css';
import { Table } from './table.js';
import { DATA_ELEMENTS } from '../../const.js';
import { dataElemntsAndValidation } from '../../dataElementsAndValidataion.js';
import { Line } from 'react-chartjs-2';
import { useWorkflowContext } from '../../workflow-context/index.js';

const generateColor = (validationRuleDescription) => {
    const length = validationRuleDescription.length;
    const hue = (length * 37) % 360;
    return `hsl(${hue}, 70%, 60%)`;
};

const getValidationColor = (validationRuleDescription) => generateColor(validationRuleDescription);

const outlierQuery = {
    outliers: {
        resource: 'outlierDetection',
        params: ({ dataSetId, startDate, endDate, orgUnitId }) => ({
            ds: dataSetId,
            startDate,
            endDate,
            ou: orgUnitId,
        }),
    },
};

// Define validation mutation for POST request
const validationMutation = {
    resource: 'dataAnalysis/validationRules',
    type: 'create',
    data: ({ startDate, endDate, orgUnitId, validationRuleGroup }) => ({
        startDate,
        endDate,
        ou: orgUnitId,
        notification: false,
        persist: false,
        vrg: validationRuleGroup,
    }),
    headers: {
        'Content-Type': 'application/json',
    },
};

const getPreviousPeriods = (period, numberOfPeriods) => {
    const previousPeriods = [];
    let currentPeriod = new Date(period.startDate);
    for (let i = 1; i <= numberOfPeriods; i++) {
        currentPeriod.setMonth(currentPeriod.getMonth() - 1);
        previousPeriods.push({
            id: `${currentPeriod.getFullYear()}${String(currentPeriod.getMonth() + 1).padStart(2, '0')}`,
            displayName: currentPeriod.toLocaleString('default', { month: 'long', year: 'numeric' }),
        });
    }
    return previousPeriods;
};

const sortPeriods = (periodIds) => {
    return periodIds.sort((a, b) => {
        const aYear = parseInt(a.substring(0, 4));
        const aMonth = parseInt(a.substring(4, 6));
        const bYear = parseInt(b.substring(0, 4));
        const bMonth = parseInt(b.substring(4, 6));
        return aYear === bYear ? aMonth - bMonth : aYear - bYear;
    });
};

const saveDataMutation = {
    resource: 'dataValueSets',
    type: 'create',
    data: ({ dataSet, period, orgUnit, dataValues }) => ({
        dataSet,
        period,
        orgUnit,
        dataValues,
    }),
};

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

const OutlierDisplay = ({ dataSetId, showPreviousPeriods }) => {
    const { approvalStatus } = useWorkflowContext();
    const selection = useSelectionContext();
    const { orgUnit, workflow, period } = selection;
    const { dataSets } = workflow;
    const selectedDataSet = dataSets.find(({ id }) => id === dataSetId);

    const previousPeriods = useMemo(() => showPreviousPeriods ? getPreviousPeriods(period, 6) : [], [showPreviousPeriods, period]);
    const periodIds = useMemo(() => sortPeriods([...previousPeriods.map(p => p.id), period.id]), [previousPeriods, period.id]);

    const [selectedData, setSelectedData] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newValue, setNewValue] = useState('');
    const [comment, setComment] = useState('');
    const [selectedOption, setSelectedOption] = useState('');
    const [analyticsData, setAnalyticsData] = useState(null);
    const [outliers, setOutliers] = useState([]);
    const [validationData, setValidationData] = useState([]);
    const [activeTab, setActiveTab] = useState('');
    const [selectedRowData, setSelectedRowData] = useState(null);
    const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);

    const [mutateData] = useDataMutation(saveDataMutation);
    const [mutateComment] = useDataMutation(saveCommentMutation);
    const [mutateValidationData] = useDataMutation(validationMutation); // For fetching validation data

    const orgUnitPath = orgUnit.path.split('/');
    const orgUnitLevel = orgUnitPath.length - 1;

    const analyticsQuery = useMemo(() => {
        const orgUnitGroupMap = {
            1: '',
            2: '',
            3: 'OU_GROUP-U53tdte60Ku;OU_GROUP-S8nZUO4pUE8;OU_GROUP-GiRpQWVJ24q;OU_GROUP-gHfSdwPrC83',
        };
        const orgUnitGroup = orgUnitGroupMap[orgUnitLevel] || '';
        return {
            analytics: {
                resource: 'analytics.json',
                params: ({ dataElementIds, orgUnitId, periodIds }) => ({
                    dimension: [`dx:${dataElementIds.join(';')}`, `ou:${orgUnitId};${orgUnitGroup}`, `pe:${periodIds.join(';')}`],
                }),
            },
        };
    }, [orgUnitLevel]);

    const { called, fetching, data, error, refetch } = useDataQuery(analyticsQuery, { lazy: true });
    const { data: outlierData, refetch: refetchOutliers } = useDataQuery(outlierQuery, { lazy: true });

    const fetchAnalytics = async () => {
        if (DATA_ELEMENTS && periodIds.length && orgUnit.id) {
            refetch({ dataElementIds: DATA_ELEMENTS, orgUnitId: orgUnit.id, periodIds });
    
            const year = parseInt(period.id.substring(0, 4));
            const month = (parseInt(period.id.substring(4, 6)) % 12) + 1;
            const endDate = `${year}-${String(month).padStart(2, '0')}-01`;
    
            const startDate = new Date(endDate);
            startDate.setFullYear(startDate.getFullYear());
            const startDateString = `${startDate.getFullYear()}-${String(startDate.getMonth()).padStart(2, '0')}-01`;
    
            refetchOutliers({ dataSetId, startDate: startDateString, endDate, orgUnitId: orgUnit.id });
    
            const validationStartDate = new Date(period.id.substring(0, 4), period.id.substring(4, 6) - 1, 15);
            validationStartDate.setMonth(validationStartDate.getMonth() - 1);
            const validationEndDate = new Date(period.id.substring(0, 4), period.id.substring(4, 6) - 1, 15);
            validationEndDate.setMonth(validationEndDate.getMonth() + 1);
    
            try {
                const response = await mutateValidationData({
                    startDate: validationStartDate.toISOString().split('T')[0],
                    endDate: validationEndDate.toISOString().split('T')[0],
                    orgUnitId: orgUnit.id,
                    validationRuleGroup: 'zeUYBTRY6vY',
                });
                setValidationData(response); // Store the response directly
            } catch (error) {
                console.error('Failed to fetch validation data:', error);
            }
        }
    };
    

    useEffect(() => {
        fetchAnalytics();
    }, [dataSetId, periodIds, orgUnit.id]);

    useEffect(() => {
        if (data) setAnalyticsData(data.analytics);
    }, [data]);

    useEffect(() => {
        if (outlierData) setOutliers(outlierData.outliers.outlierValues);
    }, [outlierData]);

    if (!dataSets || dataSets.length === 0) {
        return (
            <div className={styles.noData}>
                <p>{i18n.t('This workflow does not contain any data sets.')}</p>
            </div>
        );
    }

    if (!dataSetId) {
        return (
            <div className={styles.chooseDataSet}>
                <h2>{i18n.t('Choose a data set to review')}</h2>
                <p>
                    {i18n.t('{{- workflowName}} has multiple data sets. Choose a data set from the tabs above.', {
                        workflowName: workflow.displayName,
                    })}
                </p>
            </div>
        );
    }

    if ((!called && periodIds.length) || fetching) {
        return (
            <div className={styles.display}>
                <div className={styles.loadingWrapper}>
                    <CircularLoader small />
                    {i18n.t('Loading data set')}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.display}>
                <NoticeBox error title={i18n.t('There was a problem displaying this data set')}>
                    <p>{i18n.t(`This data set couldn't be loaded or displayed. Try again, or contact your system administrator.`)}</p>
                    <RetryButton onClick={fetchAnalytics}>{i18n.t('Retry loading data set')}</RetryButton>
                </NoticeBox>
            </div>
        );
    }

    if (!periodIds.length || !analyticsData?.rows?.length) {
        return (
            <div className={styles.noData}>
                <p>
                    {i18n.t(`This data set doesn't have any data for {{- period}} in {{- orgUnit}}.`, {
                        period: period.displayName,
                        orgUnit: orgUnit.displayName,
                    })}
                </p>
            </div>
        );
    }


    const { headers, metaData, rows } = analyticsData;
    const dataElementIndex = headers.findIndex(header => header.name === 'dx');
    const periodIndex = headers.findIndex(header => header.name === 'pe');
    const valueIndex = headers.findIndex(header => header.name === 'value');
    const orgUnitIndex = headers.findIndex(header => header.name === 'ou');

    const rowsByOrgUnit = rows.reduce((acc, row) => {
        const orgUnit = row[orgUnitIndex];
        if (!acc[orgUnit]) acc[orgUnit] = [];
        acc[orgUnit].push(row);
        return acc;
    }, {});

    const isOutlier = (dataElement, period) => outliers.some(outlier => outlier.de === dataElement && outlier.pe === period);

    const getValidationViolations = (dataElement, orgUnitId) => {
        return validationData
            .filter(vr =>
                vr.organisationUnitId === orgUnitId &&
                dataElemntsAndValidation.some(dev => dev.value === vr.validationRuleId && dev.key === dataElement),
            )
            .map(vr => vr.validationRuleDescription);
    };

    const handleMenuClick = (dataElement, period, orgUnit, category, currentValue, option, coc, comment) => {
        if (approvalStatus !== 'APPROVED_HERE' && approvalStatus !== 'APPROVED_ABOVE') {
            // Set coc and comment in selectedData
            setSelectedData({ dataElement, period, orgUnit, category, coc, comment });
            setNewValue(currentValue);
            setComment(comment || ''); // Set the comment if available
            setSelectedOption(option);
            setIsModalOpen(true);
        }
    };
    
    const handleSave = async () => {
        const { dataElement, period, orgUnit, category, coc } = selectedData;
        const dataElementId = dataElement.split('.')[0];
        const categoryOptionCombo = coc || dataElement.split('.')[1];
    
        const dataToSave = {
            dataSet: dataSetId,
            period,
            orgUnit: orgUnit.id,
            dataValues: [{
                dataElement: dataElementId,
                value: newValue,
                comment,
                categoryOptionCombo, // Include dynamic coc here
            }],
        };
    
        try {
            if (selectedOption === 'correctData') {
                await mutateData(dataToSave);
            } else if (selectedOption === 'comment') {
                await mutateComment(dataToSave);
            }
            setIsModalOpen(false);
            fetchAnalytics();
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    };
      

    const getFilteredDataElements = (orgUnitId) => {
        if (orgUnitLevel <= 2) return DATA_ELEMENTS;

        const outlierDataElements = outliers
            .filter(outlier => outlier.ou === orgUnitId && outlier.pe === period.id)
            .map(outlier => outlier.de);

        const validationDataElements = validationData
            .filter(vr => vr.organisationUnitId === orgUnitId)
            .map(vr => {
                return dataElemntsAndValidation
                    .filter(dev => dev.value === vr.validationRuleId)
                    .map(dev => dev.key);
            })
            .flat();

        return [...new Set([...outlierDataElements, ...validationDataElements])];
    };

    const handleGraphClick = (rowData) => {
        setSelectedRowData(rowData);
        setIsGraphModalOpen(true);
    };

    return (
        <div className={styles.displayContainer}>
            <div className={styles.orgUnitList}>
                {Object.keys(rowsByOrgUnit).map(orgUnitId => {
                    const orgUnitName = metaData.items[orgUnitId]?.name || orgUnitId;
                    return (
                        <Button key={orgUnitId} onClick={() => setActiveTab(orgUnitId)} primary={activeTab === orgUnitId}>
                            {orgUnitName}
                        </Button>
                    );
                })}
<Button
    onClick={() => {
        if (activeTab) { // Ensure the button is only functional when an orgUnit button is active
            const printArea = document.querySelector(`.${styles.tableContainer}`);
            const printWindow = window.open('', '_blank');
            printWindow.document.write('<html><head><title>Print Table</title></head><body>');
            printWindow.document.write(`<style>
                table { border-collapse: collapse; width: 100%; }
                table, th, td { border: 1px solid black; }
                th, td { padding: 8px; text-align: left; }
            </style>`);
            printWindow.document.write(printArea.outerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        }
    }}
    style={{
        marginTop: '10px',
        backgroundColor: activeTab ? '#ff0000' : '#a0a0a0', // Red color when active, gray when inactive
        color: '#ffffff', // White text color
        cursor: activeTab ? 'pointer' : 'not-allowed', // Pointer cursor when active, default otherwise
        border: 'none',
        padding: '10px 20px',
        borderRadius: '5px',
    }}
    disabled={!activeTab} // Disable button when no orgUnit button is active
>
    {i18n.t('Print')}
</Button>

            </div>
            <div className={styles.tableContainer}>
                {Object.keys(rowsByOrgUnit).map(orgUnitId => {
                    if (activeTab !== orgUnitId) return null;
                    const orgUnitName = metaData.items[orgUnitId]?.name || orgUnitId;
                    const orgUnitRows = rowsByOrgUnit[orgUnitId];
                    const filteredDataElements = getFilteredDataElements(orgUnitId);

                    const tableRows = filteredDataElements.reduce((acc, dataElement) => {
                        acc[dataElement] = { dataElement };
                        periodIds.forEach(period => {
                            acc[dataElement][period] = '';
                        });
                        return acc;
                    }, {});

                    orgUnitRows.forEach(row => {
                        const dataElement = row[dataElementIndex];
                        const period = row[periodIndex];
                        const value = row[valueIndex];
                        if (tableRows[dataElement]) {
                            tableRows[dataElement][period] = value;
                        }
                    });

                    const validationRows = validationData.filter(vr => vr.organisationUnitId === orgUnitId);

                    return (
                        <div key={orgUnitId} className={styles.orgUnitContainer}>
                            {orgUnitLevel > 2 && (
                                <div className={styles.leftTable}>
                                    <Table
                                        title={i18n.t('Data Element with Data Quality issue / ອົງປະກອບຂໍ້ມູນທີ່ມີບັນຫາຄຸນະພາບ')}
                                        columns={['#', 'Data Element', ...periodIds.map(p => metaData.items[p]?.name || p), 'Options', 'Graph']}
                                        rows={filteredDataElements.map((dataElement, index) => {
                                            const matchingOutlier = outliers.find(outlier => outlier.de === dataElement && outlier.pe === period.id);
                                            const coc = matchingOutlier ? matchingOutlier.coc : null;
                                            const comment = matchingOutlier ? matchingOutlier.comment : '';

                                            return [
                                                index + 1,
                                                metaData.items[dataElement]?.name || dataElement,
                                                ...periodIds.map(pid => {
                                                    const validationViolations = getValidationViolations(dataElement, orgUnitId);
                                                    return (
                                                        <div
                                                            key={`${dataElement}-${pid}`}
                                                            style={{
                                                                backgroundColor:
                                                                    pid === period.id && (isOutlier(dataElement, pid) ? '#ff7777' :
                                                                        validationViolations.length > 0 ? getValidationColor(validationViolations[0]) : 'inherit'),
                                                                padding: pid === period.id && (isOutlier(dataElement, pid) || validationViolations.length > 0) ? '4px' : 'inherit',
                                                                borderRadius: pid === period.id && (isOutlier(dataElement, pid) || validationViolations.length > 0) ? '4px' : 'inherit',
                                                                textAlign: 'center',
                                                            }}
                                                        >
                                                            {tableRows[dataElement][pid]}
                                                        </div>
                                                    );
                                                }),
                                                (orgUnitId === 'lCYX4nCUeCS' || orgUnitId === 'ckVkkcbIO2M'|| orgUnitLevel === 4) && (
                                                    <DropdownButton
                                                        key={`${dataElement}-${index}`}
                                                        component={
                                                            <Menu>
                                                                <MenuItem
                                                                    key={`${dataElement}-correctData-${index}`}
                                                                    label={i18n.t('Correct Data')}
                                                                    onClick={() => handleMenuClick(dataElement, period.id, orgUnit, 'default', tableRows[dataElement][period.id], 'correctData', coc, comment)}
                                                                />
                                                                <MenuItem
                                                                    key={`${dataElement}-comment-${index}`}
                                                                    label={i18n.t('Comment')}
                                                                    onClick={() => handleMenuClick(dataElement, period.id, orgUnit, 'default', tableRows[dataElement][period.id], 'comment', coc, comment)}
                                                                />
                                                            </Menu>
                                                        }
                                                        className={styles.customDropdownButton}
                                                        disabled={approvalStatus === 'APPROVED_HERE' || approvalStatus === 'APPROVED_ABOVE'}
                                                    />
                                                ),
                                                <img
                                                    src={`${process.env.PUBLIC_URL}/chart-line-solid.svg`}
                                                    alt="Graph"
                                                    style={{
                                                        width: '25px',
                                                        height: '25px',
                                                        padding: '5px',
                                                        border: '1px solid #a0adba',
                                                        borderRadius: '5px',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => handleGraphClick(tableRows[dataElement])}
                                                />
                                            ];
                                        })}
                                    />
                                </div>
                            )}
                            
                            {orgUnitLevel >= 1 && (
                                <div key={orgUnitId} className={orgUnitLevel <= 2 ? styles.leftTable : styles.rightTable}>
                                    {validationData.length > 0 && (
                                        <Table
                                            title={i18n.t('Validation Rule Violations')}
                                            columns={orgUnitLevel === 1 
                                                ? ['Province', 'district', 'HF', 'Validation', 'Left side', 'Operator', 'Right side','Importance']
                                                : orgUnitLevel === 2
                                                ? ['District', 'HF', 'Validation', 'Left side', 'Operator', 'Right side','Importance']
                                                : ['Validation', 'Left side', 'Operator', 'Right side', 'Code']}
                                            rows={orgUnitLevel === 1
                                                ? validationData.map((vr, index) => [
                                                    vr.organisationUnitAncestorNames.split('/')[1],
                                                    vr.organisationUnitAncestorNames.split('/')[2],
                                                    vr.organisationUnitDisplayName,
                                                    vr.validationRuleDescription,
                                                    vr.leftSideValue,
                                                    vr.operator,
                                                    vr.rightSideValue,
                                                    vr.importance
                                                ])
                                                :
                                                orgUnitLevel === 2
                                                ? validationData.map((vr, index) => [
                                                    vr.organisationUnitAncestorNames.split('/')[2],
                                                    vr.organisationUnitDisplayName,
                                                    vr.validationRuleDescription,
                                                    vr.leftSideValue,
                                                    vr.operator,
                                                    vr.rightSideValue,
                                                    vr.importance
                                                ])
                                                : validationRows.map((vr, index) => [
                                                    vr.validationRuleDescription,
                                                    vr.leftSideValue,
                                                    vr.operator,
                                                    vr.rightSideValue,
                                                    <div
                                                        style={{
                                                            width: '15px',
                                                            height: '15px',
                                                            backgroundColor: getValidationColor(vr.validationRuleDescription),
                                                            borderRadius: '3px',
                                                        }}
                                                    />,
                                                ])}
                                        />
                                    )}<br></br><div></div>
                                    {/* Outliers table */}
                                    {outliers.length > 0 && (
                                        <Table 
                                            title={i18n.t('Details of outlier data')}
                                            className={styles.rightTable}
                                            columns={orgUnitLevel === 1
                                                ? ['HF', 'Data Element', 'Value','Mean', 'Lower Bound', 'Upper Bound']
                                                : orgUnitLevel === 2
                                                ? ['HF', 'Data Element', 'Value',  'Mean', 'Lower Bound', 'Upper Bound']
                                                : ['Data Element1', 'Value', 'Mean', 'Lower Bound', 'Upper Bound','Code']}
                                            rows={orgUnitLevel === 1
                                                ? outliers.map((outlier, index) => [
                                                    outlier.ouName,
                                                    outlier.deName,
                                                    outlier.value,
                                                    outlier.mean.toFixed(2),
                                                    outlier.lowerBound.toFixed(2),
                                                    outlier.upperBound.toFixed(2),
                                                ])
                                                : orgUnitLevel === 2
                                                ? outliers.map((outlier, index) => [
                                                    outlier.ouName,
                                                    outlier.deName,
                                                    outlier.value,
                                                    outlier.mean.toFixed(2),
                                                    outlier.lowerBound.toFixed(2),
                                                    outlier.upperBound.toFixed(2),
                                                ])
                                                : outliers
                                                    .filter(outlier => outlier.ou === orgUnitId && outlier.pe === period.id)
                                                    .map((outlier, index) => [
                                                        outlier.deName,
                                                        outlier.value,
                                                        outlier.mean.toFixed(2),
                                                        outlier.lowerBound.toFixed(2),
                                                        outlier.upperBound.toFixed(2),
                                                        <div
                                                        style={{
                                                            width: '15px',
                                                            height: '15px',
                                                            backgroundColor: '#ff7777',
                                                            borderRadius: '3px',
                                                        }} 
                                                    />,
                                                ])}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {orgUnitLevel === 4 && isModalOpen && (
                <Modal onClose={() => setIsModalOpen(false)}>
                    <ModalTitle>{i18n.t('Correct Data or Comment')}</ModalTitle>
                    <ModalContent>
                        {selectedOption === 'correctData' && (
                            <InputField label={i18n.t('New Value')} value={newValue} onChange={({ value }) => setNewValue(value)} />
                        )}
                        {selectedOption === 'comment' && (
                            <InputField label={i18n.t('Comment')} value={comment} onChange={({ value }) => setComment(value)} multiline />
                        )}
                    </ModalContent>
                    <ModalActions>
                        <Button onClick={handleSave} primary>{i18n.t('Save')}</Button>
                        <Button onClick={() => setIsModalOpen(false)}>{i18n.t('Cancel')}</Button>
                    </ModalActions>
                </Modal>
            )}
            {isGraphModalOpen && selectedRowData && (
                <Modal onClose={() => setIsGraphModalOpen(false)}>
                    <ModalTitle>{i18n.t('Graph for Selected Data Element')}</ModalTitle>
                    <ModalContent>
                    <Line
    data={{
        labels: periodIds.map((pid) => metaData.items[pid]?.name || pid),
        datasets: [
            {
                label: i18n.t('Values for Selected Data Element'),
                data: periodIds.map((pid) =>
                    selectedRowData[pid] ? parseFloat(selectedRowData[pid]) : 0
                ),
                borderColor: 'rgba(24,124,211,1)',
                backgroundColor: 'rgba(0,147,255,0.2)',
                fill: true,
            },
            {
                label: i18n.t('Lower Bound'),
                data: periodIds.map((pid) => {
                    const outlier = outliers.find(
                        (o) => o.de === selectedRowData.dataElement
                    );
                    return outlier ? parseFloat(outlier.lowerBound) : null;
                }).map((value, index, array) => value ?? array[index - 1] ?? array[index + 1]),
                borderColor: 'rgba(255,99,132,1)',
                borderDash: [5, 5], // Dashed line for the lower bound
                borderWidth: 2,
                fill: false,
            },
            {
                label: i18n.t('Upper Bound'),
                data: periodIds.map((pid) => {
                    const outlier = outliers.find(
                        (o) => o.de === selectedRowData.dataElement
                    );
                    return outlier ? parseFloat(outlier.upperBound) : null;
                }).map((value, index, array) => value ?? array[index - 1] ?? array[index + 1]),
                borderColor: 'rgba(75,192,192,1)',
                borderDash: [5, 5], // Dashed line for the upper bound
                borderWidth: 2,
                fill: false,
            },
        ],
    }}
    options={{
        scales: {
            y: {
                beginAtZero: true,
                min: 0,
            },
        },
        animation: {
            duration: 2000,
            easing: 'easeInOutQuad',
        },
        plugins: {
            legend: {
                position: 'top',
            },
        },
    }}
/>

                    </ModalContent>
                    <ModalActions>
                        <Button onClick={() => setIsGraphModalOpen(false)}>{i18n.t('Close')}</Button>
                    </ModalActions>
                </Modal>
            )}
        </div>
    );
};

OutlierDisplay.propTypes = {
    dataSetId: PropTypes.string,
    showPreviousPeriods: PropTypes.bool,
};

export { OutlierDisplay };
