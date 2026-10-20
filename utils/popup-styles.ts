export const PRINT_PREVIEW_STYLES = `
                        body {
                            font-family: 'Poppins', sans-serif;
                            margin: 20px;
                            background: #f5f5f5;
                        }
                        .preview-container {
                            background: white;
                            padding: 20px;
                            border: 1px solid #ccc;
                            border-radius: 8px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        .preview-header {
                            background: #000;
                            color: white;
                            padding: 10px;
                            margin: -20px -20px 20px -20px;
                            text-align: center;
                            font-weight: bold;
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
                            border: 2px solid #000;
                            border-radius: 5px;
                            font-weight: bold;
                            cursor: pointer;
                            box-shadow: 2px 2px 0 #000;
                        }
                        .preview-btn-print {
                            background: #46ff90;
                            color: #000;
                        }
                        .preview-btn-close {
                            background: #ff4444;
                            color: white;
                        }

`
export const LEGACY_REPORT_STYLES = `
                            body {
                                font-family: 'Poppins', sans-serif;
                                padding: 2em;
                                background-color: #f6f6f6;
                                line-height: 1.6;
                            }
                            .header {
                                text-align: center;
                                margin-bottom: 2em;
                                border-bottom: 2px solid #000;
                                padding-bottom: 1em;
                            }
                            .report-content {
                                background: white;
                                padding: 2em;
                                border: 2px solid #000;
                                border-radius: 8px;
                                font-size: 16px;
                            }
                            .tickers {
                                background: #46ff90;
                                padding: 0.5em 1em;
                                border: 2px solid #000;
                                display: inline-block;
                                margin-bottom: 1em;
                                font-weight: bold;
                            }
                            .disclaimer {
                                text-align: center;
                                font-size: 12px;
                                margin-top: 2em;
                                color: #666;
                            }
`
