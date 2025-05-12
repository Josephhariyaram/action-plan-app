import { CssVariables } from '@dhis2/ui'
import React, { useState } from 'react'
import { AppProvider } from '../app-context/index.js'
import { AuthWall } from '../auth/index.js'
import { SelectionProvider } from '../selection-context/index.js'
import { TopBar } from '../top-bar/index.js'
import { WorkflowProvider } from '../workflow-context/index.js'
import { Layout } from './layout.js'
import { DataWorkspace } from '../data-workspace/index.js'
import { BottomBar } from '../bottom-bar/index.js' // Import BottomBar

const App = () => {
    const [showBottomBar, setShowBottomBar] = useState(false)

    return (
        <>
            <CssVariables spacers colors theme />
            <AppProvider>
                <AuthWall>
                    <SelectionProvider>
                        <Layout.Container>
                            <Layout.Top>
                                <TopBar />
                            </Layout.Top>
                            <WorkflowProvider>
                                <Layout.Content>
                                    <DataWorkspace setShowBottomBar={setShowBottomBar} />
                                </Layout.Content>
                                {showBottomBar && (
                                    <Layout.Bottom>
                                        <BottomBar />
                                    </Layout.Bottom>
                                )}
                            </WorkflowProvider>
                        </Layout.Container>
                    </SelectionProvider>
                </AuthWall>
            </AppProvider>
        </>
    )
}

export { App }
