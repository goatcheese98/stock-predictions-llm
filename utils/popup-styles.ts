export const PRINT_PREVIEW_STYLES = `
                        body {
                            font-family: var(--font);
                            margin: 20px;
                            background: var(--bg);
                        }
                        .preview-container {
                            background: var(--panel);
                            padding: 20px;
                            border: 1px solid var(--line);
                            border-radius: var(--r-sm);
                            box-shadow: var(--shadow);
                        }
                        .preview-header {
                            background: var(--panel2);
                            color: var(--fg);
                            padding: 10px;
                            margin: -20px -20px 20px -20px;
                            text-align: center;
                            font-weight: bold;
                        }
                        .preview-container .print-chart-canvas {
                            display: block;
                            max-width: 100%;
                            height: auto;
                        }
                        .preview-actions {
                            position: fixed;
                            bottom: 20px;
                            right: 20px;
                            display: flex;
                            gap: 10px;
                        }
                        .preview-btn {
                            padding: 10px 20px;
                            border: 2px solid var(--line);
                            border-radius: var(--r-sm);
                            font-weight: bold;
                            cursor: pointer;
                            box-shadow: var(--shadow);
                        }
                        .preview-btn-print {
                            background: var(--acc);
                            color: var(--on-acc);
                        }
                        .preview-btn-close {
                            background: var(--panel2);
                            color: var(--fg);
                        }

`
export const LEGACY_REPORT_STYLES = `
                            body {
                                font-family: var(--font);
                                padding: 2em;
                                background-color: var(--bg);
                                line-height: 1.6;
                            }
                            .header {
                                text-align: center;
                                margin-bottom: 2em;
                                border-bottom: 2px solid var(--line);
                                padding-bottom: 1em;
                            }
                            .report-content {
                                background: var(--panel);
                                padding: 2em;
                                border: 2px solid var(--line);
                                border-radius: var(--r-sm);
                                font-size: var(--fs-16);
                            }
                            .tickers {
                                background: var(--acc);
                                color: var(--on-acc);
                                padding: 0.5em 1em;
                                border: 2px solid var(--line);
                                display: inline-block;
                                margin-bottom: 1em;
                                font-weight: bold;
                            }
                            .disclaimer {
                                text-align: center;
                                font-size: var(--fs-12);
                                margin-top: 2em;
                                color: var(--mut);
                            }
`
