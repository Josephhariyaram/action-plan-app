import React, { useState, useEffect } from 'react'
import { useSelectionContext } from '../selection-context/index.js'
import { DataSetNavigation } from './data-set-navigation/index.js'
import { TitleBar } from './title-bar/index.js'
import { useSelectedDataSet } from './use-selected-data-set/index.js'
import { ApprovalDisplay } from './display/ApprovalDisplay.js'
import { OutlierDisplay } from './display/OutlierDisplay.js'
import { ActionPlanDisplay } from './display/ActionPlanDisplay.js'
import { CompletenessDisplay } from './display/CompletenessDisplay.js' // Import CompletenessDisplay
import styles from './data-workspace.module.css'

const DataWorkspace = ({ setShowBottomBar }) => {
    const { workflow, selectDataSet, period } = useSelectionContext()
    const selectedDataSet = useSelectedDataSet()
    const [activeTab, setActiveTab] = useState('completeness') // Set the default tab to 'completeness'

    useEffect(() => {
        setShowBottomBar(activeTab === 'approval')
    }, [activeTab, setShowBottomBar])

    const renderTabContent = () => {
        switch (activeTab) {
            case 'completeness':
                return <CompletenessDisplay dataSetId={selectedDataSet} showPreviousPeriods={true} /> // Render Completeness display
            case 'outlier':
                return <OutlierDisplay dataSetId={selectedDataSet} showPreviousPeriods={true} isOutlier={true} />
            case 'actionPlan':
                return <ActionPlanDisplay /> // Render the Action Plan display
            case 'approval':
                return <ApprovalDisplay dataSetId={selectedDataSet} showPreviousPeriods={true} />
            default:
                return null
        }
    }

    return (
        <>
            <TitleBar />
            <div className={styles.tabBar}>
                <button
                    className={activeTab === 'completeness' ? styles.active : ''}
                    onClick={() => setActiveTab('completeness')}
                >
                    Completeness / ຄວາມຄົນຖ້ວນຂອງຂໍ້ມູນ
                </button>
                <button
                    className={activeTab === 'outlier' ? styles.active : ''}
                    onClick={() => setActiveTab('outlier')}
                >
                    Validation Rules & Outlier / ຫຼັກການກວດສອບຂໍ້ມູນ ແລະ ຂໍ້ມູນທີ່ມີຄ່າຜິດປົກກະຕິ 
                </button>
                <button
                    className={activeTab === 'actionPlan' ? styles.active : ''}
                    onClick={() => setActiveTab('actionPlan')}
                >
                    Action Plan / ແຜນປະຕິບັດງານ 
                </button>
                <button
                    className={activeTab === 'approval' ? styles.active : ''}
                    onClick={() => setActiveTab('approval')}
                >
                    Approval / ການອະນຸມັດຂໍ້ມູນ 
                </button>
            </div>
            <DataSetNavigation
                dataSets={workflow?.dataSets}
                selected={selectedDataSet}
                onChange={selectDataSet}
            />
            {renderTabContent()}
        </>
    )
}

export { DataWorkspace }
