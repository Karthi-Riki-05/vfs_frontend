"use client";

import React, { useEffect, useRef, useState } from 'react';
import { getFlowById } from '@/lib/flow';
import { Spin, Input, Button, message } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';

export default function EditorView({ flowId }: { flowId: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [flowName, setFlowName] = useState(""); // டயக்ராம் பெயர்

    useEffect(() => {
        setIsMounted(true);

        const handleMessage = async (event: MessageEvent) => {
            if (!event.data || typeof event.data !== 'string') return;

            try {
                const msg = JSON.parse(event.data);

                // 1. INITIAL LOAD
                if (msg.event === 'init') {
                    const data = await getFlowById(flowId);
                    setFlowName(data.name || "Untitled Diagram"); // பெயரை செட் செய்கிறோம்

                    const defaultXml = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
                    const rawData = data.xml || data.diagramData;

                    let xml = (!rawData || rawData === "{}" || (typeof rawData === 'object'))
                        ? defaultXml : rawData;

                    
                    const customBackendShapes = [
                        {
                            title: 'Employee Node',
                            xml: '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Employee" style="ellipse;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry width="80" height="40" as="geometry"/></mxCell></root></mxGraphModel>'
                        },
                        {
                            title: 'Action Box',
                            xml: '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Action" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry width="100" height="40" as="geometry"/></mxCell></root></mxGraphModel>'
                        }
                    ];
                    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
                        action: 'load',
                        xml: xml,
                        autosave: 0,

                        titles: ['My Backend Shapes'],
                        allEntries: customBackendShapes.map(shape => ({
                            title: shape.title,
                            xml: shape.xml,
                            aspect: 'fixed'
                        }))
                    }), '*');
                }

                // 2. SAVE BUTTON CLICKED IN DRAW.IO
                if (msg.event === 'save') {
                    triggerExport();
                }

                // 3. EXPORTING DATA (XML + THUMBNAIL)
                if (msg.event === 'export') {
                    const imageData = msg.data;
                    const xmlData = msg.xml;

                    try {
                        const response = await fetch('/api/save-diagram', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                flowId,
                                name: flowName, // அப்டேட் செய்யப்பட்ட பெயர்
                                xml: xmlData,
                                thumbnail: imageData
                            }),
                        });

                        if (response.ok) {
                            message.success("Diagram & Name saved!");
                            iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
                                action: 'status',
                                message: 'Saved successfully!',
                                modified: false
                            }), '*');
                        }
                    } catch (err) {
                        message.error("Save failed!");
                    }
                }

                if (msg.event === 'exit') {
                    handleExit();
                }

            } catch (e) { }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [flowId, flowName]); // flowName மாறும்போது மெசேஜ் ஹேண்ட்லர் அப்டேட் ஆக வேண்டும்

    const triggerExport = () => {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
            action: 'export',
            format: 'png',
            spin: 'Saving diagram...'
        }), '*');
    };

    const handleExit = () => {
        // Since editor opens in a new tab, try to close it
        window.close();
        // Fallback: if browser blocks window.close() (tab not opened via script)
        setTimeout(() => {
            window.location.href = '/dashboard/flows';
        }, 100);
    };

    if (!isMounted) return null;

    return (
        <div style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
            {/* TOP BAR FOR NAME EDITING */}
            <div style={{
                height: '50px',
                background: '#f3f3f3',
                display: 'flex',
                alignItems: 'center',
                padding: '0 15px',
                borderBottom: '1px solid #ddd',
                gap: '15px'
            }}>
                <Button icon={<ArrowLeftOutlined />} onClick={handleExit} type="text" />

                <Input
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    style={{ width: '300px', fontWeight: 'bold' }}
                    variant="borderless"
                    placeholder="Diagram Name"
                />

                <div style={{ flex: 1 }} />

                {/* <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={triggerExport}
                >
                    Save Changes
                </Button> */}
            </div>

            {/* IFRAME EDITOR */}
            <div style={{ flex: 1, position: 'relative' }}>
                {loading && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        <Spin size="large" tip="Loading Editor..." />
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    src={`/draw_io/index.html?embed=1&proto=json&spin=1&noExitBtn=0&noSaveBtn=0&sketch=1&ui=sketch&touch=1`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    onLoad={() => setLoading(false)}
                />
            </div>
        </div>
    );
}