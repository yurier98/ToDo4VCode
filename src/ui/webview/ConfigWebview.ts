import * as vscode from 'vscode';
import { MEDIA_PATHS } from '../../core/constants/media-paths';
import { PRIORITIES } from '../../constants';

export class ConfigWebview {
    public static getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.STYLES_MAIN_CSS));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.SCRIPT_MAIN_JS));
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.CODICONS_CSS));

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>ToDo4VCode Settings</title>
                <link rel="stylesheet" href="${codiconsUri}">
                <link rel="stylesheet" href="${styleUri}">
            </head>
            <body>
                <div class="config-container">
                    <div class="config-content">
                        <div class="config-section-content" id="general-section">
                            <h1 class="config-title">General</h1>
                            
                            <h2 class="section-label">Preferences</h2>
                            <div class="config-card">
                                <div class="config-section-items">
                                    <div class="config-item">
                                        <div class="config-item-info">
                                            <div class="config-item-title">Hide Completed Tasks</div>
                                            <div class="config-item-desc">Hide completed tasks from the list</div>
                                        </div>
                                        <div class="config-item-action">
                                            <div class="toggle-switch" id="hideCompleted">
                                                <div class="toggle-slider"></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="config-item">
                                        <div class="config-item-info">
                                            <div class="config-item-title">Default Priority</div>
                                            <div class="config-item-desc">Default priority for new tasks</div>
                                        </div>
                                        <div class="config-item-action">
                                            <div class="popover-wrapper">
                                                <button class="action-btn" id="defaultPriorityBtn" onclick="toggleConfigPriorityPicker(event)">
                                                    <i class="codicon codicon-flag"></i>
                                                    <span id="defaultPriorityLabel">${PRIORITIES.SHOULD}</span>
                                                </button>
                                                <div id="configPriorityPopover" class="premium-popover">
                                                    <div class="popover-item" onclick="setConfigPriority('Must')"><i class="codicon codicon-flag" style="color: #FF3B30"></i> ${PRIORITIES.MUST}</div>
                                                    <div class="popover-item" onclick="setConfigPriority('Should')"><i class="codicon codicon-flag" style="color: #FF9500"></i> ${PRIORITIES.SHOULD}</div>
                                                    <div class="popover-item" onclick="setConfigPriority('Could')"><i class="codicon codicon-flag" style="color: #007AFF"></i> ${PRIORITIES.COULD}</div>
                                                    <div class="popover-item" onclick="setConfigPriority('Wont')"><i class="codicon codicon-flag" style="color: #8E8E93"></i> ${PRIORITIES.WONT}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="config-section-content" id="statistics-section">
                            <h1 class="config-title">Statistics</h1>
                            
                            <h2 class="section-label">Status Bar Display</h2>
                            <div class="config-card">
                                <div class="config-section-items">
                                    <div class="config-item">
                                        <div class="config-item-info">
                                            <div class="config-item-title">Show Total</div>
                                            <div class="config-item-desc">Show total number of tasks in statistics panel</div>
                                        </div>
                                        <div class="config-item-action">
                                            <div class="toggle-switch" id="stats.showTotal">
                                                <div class="toggle-slider"></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="config-item">
                                        <div class="config-item-info">
                                            <div class="config-item-title">Show Done</div>
                                            <div class="config-item-desc">Show number of completed (Done) tasks in statistics panel</div>
                                        </div>
                                        <div class="config-item-action">
                                            <div class="toggle-switch" id="stats.showDone">
                                                <div class="toggle-slider"></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="config-item">
                                        <div class="config-item-info">
                                            <div class="config-item-title">Show Must</div>
                                            <div class="config-item-desc">Show number of Must priority tasks in statistics panel</div>
                                        </div>
                                        <div class="config-item-action">
                                            <div class="toggle-switch" id="stats.showMust">
                                                <div class="toggle-slider"></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="config-item">
                                        <div class="config-item-info">
                                            <div class="config-item-title">Show In Progress</div>
                                            <div class="config-item-desc">Show number of In Progress tasks in statistics panel</div>
                                        </div>
                                        <div class="config-item-action">
                                            <div class="toggle-switch" id="stats.showInProgress">
                                                <div class="toggle-slider"></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="config-item">
                                        <div class="config-item-info">
                                            <div class="config-item-title">Show Overdue</div>
                                            <div class="config-item-desc">Show number of overdue tasks in statistics panel</div>
                                        </div>
                                        <div class="config-item-action">
                                            <div class="toggle-switch" id="stats.showOverdue">
                                                <div class="toggle-slider"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="config-section-content" id="notifications-section">
                            <h1 class="config-title">Notifications</h1>
                            
                            <h2 class="section-label">Reminders</h2>
                            <div class="config-card">
                                <div class="config-section-items">
                                    <div class="config-item">
                                        <div class="config-item-info">
                                            <div class="config-item-title">Play Reminder Sound</div>
                                            <div class="config-item-desc">Play a sound when a task reminder is triggered</div>
                                        </div>
                                        <div class="config-item-action">
                                            <div class="toggle-switch" id="reminders.playSound">
                                                <div class="toggle-slider"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="config-section-content" id="data-management-section">
                            <h1 class="config-title">Data Management</h1>
                            
                            <h2 class="section-label">Import / Export</h2>
                            <div class="config-card">
                                <div class="config-section-items">
                                    <div class="config-item">
                                        <div class="config-item-info">
                                            <div class="config-item-title">Export Workspace Data</div>
                                            <div class="config-item-desc">Export all tasks, settings, and configurations to a JSON file.</div>
                                        </div>
                                        <div class="config-item-action">
                                            <button class="action-btn export-btn" onclick="exportWorkspaceData()">
                                                <i class="codicon codicon-git-stash-pop"></i>
                                                <span>Export</span>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div class="config-item">
                                        <div class="config-item-info">
                                            <div class="config-item-title">Import Workspace Data</div>
                                            <div class="config-item-desc">Import tasks, settings, and configurations from a previously exported JSON file.</div>
                                        </div>
                                        <div class="config-item-action">
                                            <button class="action-btn import-btn" onclick="importWorkspaceData()">
                                                <i class="codicon codicon-git-stash"></i>
                                                <span>Import</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    let currentConfig = {};
                    
                    function updateConfig(key, value) {
                        vscode.postMessage({
                            type: 'updateConfig',
                            key: key,
                            value: value
                        });
                    }
                    
                    function toggleSwitch(elementId, value) {
                        const toggle = document.getElementById(elementId);
                        if (value) {
                            toggle.classList.add('active');
                        } else {
                            toggle.classList.remove('active');
                        }
                    }
                    
                    function getToggleState(elementId) {
                        const toggle = document.getElementById(elementId);
                        return toggle.classList.contains('active');
                    }
                    
                    const PRIORITY_COLORS = {
                        'Must': '#FF3B30',
                        'Should': '#FF9500',
                        'Could': '#007AFF',
                        'Wont': '#8E8E93'
                    };
                    
                    function closeConfigPopovers() {
                        document.querySelectorAll('.premium-popover').forEach(pop => {
                            pop.classList.remove('show');
                        });
                    }
                    
                    function toggleConfigPriorityPicker(e) {
                        if (e) e.stopPropagation();
                        const pop = document.getElementById('configPriorityPopover');
                        if (!pop) return;
                        
                        const isShow = pop.classList.contains('show');
                        closeConfigPopovers();
                        
                        if (!isShow) {
                            pop.classList.add('show');
                            const rect = e.currentTarget.getBoundingClientRect();
                            const popRect = pop.getBoundingClientRect();
                            
                            pop.style.position = 'fixed';
                            
                            let left = rect.left;
                            if (left + popRect.width > window.innerWidth) {
                                left = window.innerWidth - popRect.width - 10;
                            }
                            if (left < 10) left = 10;
                            pop.style.left = left + 'px';
                            pop.style.right = 'auto';
                            
                            if (rect.bottom + popRect.height > window.innerHeight) {
                                pop.style.top = 'auto';
                                pop.style.bottom = (window.innerHeight - rect.top + 5) + 'px';
                            } else {
                                pop.style.top = (rect.bottom + 5) + 'px';
                                pop.style.bottom = 'auto';
                            }
                        }
                    }
                    
                    function setConfigPriority(priority) {
                        const label = document.getElementById('defaultPriorityLabel');
                        const icon = document.querySelector('#defaultPriorityBtn i');
                        if (label) label.innerText = priority === 'Wont' ? "Won't" : priority;
                        if (icon) icon.style.color = PRIORITY_COLORS[priority];
                        updateConfig('defaultPriority', priority);
                        closeConfigPopovers();
                    }
                    
                    function loadConfig(config) {
                        currentConfig = config;
                        
                        toggleSwitch('hideCompleted', config.hideCompleted || false);
                        
                        const defaultPriority = config.defaultPriority || 'Should';
                        const label = document.getElementById('defaultPriorityLabel');
                        const icon = document.querySelector('#defaultPriorityBtn i');
                        if (label) label.innerText = defaultPriority === 'Wont' ? "Won't" : defaultPriority;
                        if (icon) icon.style.color = PRIORITY_COLORS[defaultPriority];
                        
                        if (config.stats) {
                            toggleSwitch('stats.showTotal', config.stats.showTotal !== false);
                            toggleSwitch('stats.showDone', config.stats.showDone !== false);
                            toggleSwitch('stats.showMust', config.stats.showMust !== false);
                            toggleSwitch('stats.showInProgress', config.stats.showInProgress !== false);
                            toggleSwitch('stats.showOverdue', config.stats.showOverdue !== false);
                        }
                        
                        if (config.reminders) {
                            toggleSwitch('reminders.playSound', config.reminders.playSound !== false);
                        }
                    }
                    
                    document.addEventListener('DOMContentLoaded', () => {
                        vscode.postMessage({ type: 'configReady' });
                        
                        document.getElementById('hideCompleted').addEventListener('click', () => {
                            const newState = !getToggleState('hideCompleted');
                            toggleSwitch('hideCompleted', newState);
                            updateConfig('hideCompleted', newState);
                        });
                        
                        document.addEventListener('click', (e) => {
                            if (!e.target.closest('.popover-wrapper') && !e.target.closest('.premium-popover')) {
                                closeConfigPopovers();
                            }
                        });
                        
                        document.getElementById('stats.showTotal').addEventListener('click', () => {
                            const newState = !getToggleState('stats.showTotal');
                            toggleSwitch('stats.showTotal', newState);
                            updateConfig('stats.showTotal', newState);
                        });
                        
                        document.getElementById('stats.showDone').addEventListener('click', () => {
                            const newState = !getToggleState('stats.showDone');
                            toggleSwitch('stats.showDone', newState);
                            updateConfig('stats.showDone', newState);
                        });
                        
                        document.getElementById('stats.showMust').addEventListener('click', () => {
                            const newState = !getToggleState('stats.showMust');
                            toggleSwitch('stats.showMust', newState);
                            updateConfig('stats.showMust', newState);
                        });
                        
                        document.getElementById('stats.showInProgress').addEventListener('click', () => {
                            const newState = !getToggleState('stats.showInProgress');
                            toggleSwitch('stats.showInProgress', newState);
                            updateConfig('stats.showInProgress', newState);
                        });
                        
                        document.getElementById('stats.showOverdue').addEventListener('click', () => {
                            const newState = !getToggleState('stats.showOverdue');
                            toggleSwitch('stats.showOverdue', newState);
                            updateConfig('stats.showOverdue', newState);
                        });
                        
                        document.getElementById('reminders.playSound').addEventListener('click', () => {
                            const newState = !getToggleState('reminders.playSound');
                            toggleSwitch('reminders.playSound', newState);
                            updateConfig('reminders.playSound', newState);
                        });
                    });
                    
                    function exportWorkspaceData() {
                        vscode.postMessage({ type: 'exportData' });
                    }
                    
                    function importWorkspaceData() {
                        vscode.postMessage({ type: 'importData' });
                    }
                    
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'configData') {
                            loadConfig(message.config);
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}
