// src/utils/approvalUtils.js
export const fetchApprovalStatuses = async (engine, orgUnitId, childOrgUnits, periodId) => {
    if (!childOrgUnits || childOrgUnits.length === 0) {
        return {};
    }

    const orgUnitsQuery = `${orgUnitId},${childOrgUnits.join(',')}`;
    const approvalQuery = {
        approvals: {
            resource: 'dataApprovals/approvals',
            params: {
                wf: 'stfYnMHvmta',
                pe: periodId,
                ou: orgUnitsQuery,
            },
        },
    };

    const response = await engine.query(approvalQuery);
    return response.approvals.reduce((acc, approval) => {
        acc[approval.ou] = approval.state === 'UNAPPROVED_READY'
            ? 'Not Approved'
            : approval.state === 'UNAPPROVED_WAITING'
            ? 'Waiting lower-level approval'
            : approval.state === 'APPROVED_HERE'
            ? 'Approved'
            : approval.state === 'APPROVED_ABOVE'
            ? 'Approved'
            : 'N/A';
        return acc;
    }, {});
};
