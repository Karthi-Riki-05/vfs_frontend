"use client";

import React, { useEffect, useRef, useState } from 'react';
import { getFlowById } from '@/lib/flow';
import { Spin, Input, Button, message, Tag } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, LockOutlined, EditOutlined } from '@ant-design/icons';

export default function EditorView({ flowId }: { flowId: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [flowName, setFlowName] = useState("");
    const [permission, setPermission] = useState<string | null>(null);
    const permRef = useRef<string | null>(null);

    const isReadOnly = permission === 'view';
    const isSharedEdit = permission === 'edit';

    useEffect(() => {
        setIsMounted(true);

        const handleMessage = async (event: MessageEvent) => {
            if (!event.data || typeof event.data !== 'string') return;
            // Only handle messages from our own editor iframe
            if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;

            try {
                const msg = JSON.parse(event.data);

                // 1. INITIAL LOAD
                if (msg.event === 'init') {
                    const data = await getFlowById(flowId);
                    setFlowName(data.name || "Untitled Diagram");
                    const perm = data.permission || 'owner';
                    setPermission(perm);
                    permRef.current = perm;

                    const defaultXml = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
                    const rawData = data.xml || data.diagramData;

                    let xml = (!rawData || rawData === "{}" || (typeof rawData === 'object'))
                        ? defaultXml : rawData;

                    // Load AI-generated XML if coming from AI assistant
                    const aiXml = sessionStorage.getItem('ai_generated_xml');
                    const aiName = sessionStorage.getItem('ai_generated_name');
                    if (aiXml) {
                        xml = aiXml;
                        if (aiName) setFlowName(aiName);
                        sessionStorage.removeItem('ai_generated_xml');
                        sessionStorage.removeItem('ai_generated_name');
                    }


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
                    if (permRef.current === 'view') {
                        message.warning("You have view-only access to this flow");
                        return;
                    }
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
                                name: flowName,
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
                        } else {
                            const errData = await response.json().catch(() => ({}));
                            message.error(errData?.error?.message || "Save failed — you may have view-only access");
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
    }, [flowId, flowName]);

    // Listen for AI-generated XML injection — MERGE into existing diagram.
    // Sends 'mergeAiXml' postMessage to the draw.io iframe, which is handled
    // by over-ride.js using graph.importCells() — the same approach draw.io's
    // own AI chat uses. This ADDS cells at a free position without replacing
    // existing content or changing view settings (grid, page, background).
    useEffect(() => {
        function handleAiXml(e: CustomEvent) {
            const { xml } = e.detail || {};
            console.log('[EditorView] aiXmlReady received, xml length:', xml?.length, 'iframe:', !!iframeRef.current?.contentWindow);
            if (xml && iframeRef.current?.contentWindow) {
                console.log('[EditorView] Sending mergeAiXml to iframe');
                iframeRef.current.contentWindow.postMessage(JSON.stringify({
                    action: 'mergeAiXml',
                    xml,
                }), '*');
            }
        }
        window.addEventListener('aiXmlReady', handleAiXml as EventListener);
        return () => window.removeEventListener('aiXmlReady', handleAiXml as EventListener);
    }, []);

    const triggerExport = () => {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
            action: 'export',
            format: 'png',
            spin: 'Saving diagram...'
        }), '*');
    };

    const handleExit = () => {
        window.close();
        setTimeout(() => {
            window.location.href = '/dashboard/flows';
        }, 100);
    };

    if (!isMounted) return null;

    return (
        <div style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
            {/* Permission banner */}
            {isReadOnly && (
                <div style={{
                    height: 36,
                    background: '#FFF7E6',
                    borderBottom: '1px solid #FFD591',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#AD6800',
                }}>
                    <LockOutlined /> View only — You can view this flow but cannot edit it
                </div>
            )}
            {isSharedEdit && (
                <div style={{
                    height: 36,
                    background: '#F6FFED',
                    borderBottom: '1px solid #B7EB8F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#389E0D',
                }}>
                    <EditOutlined /> Shared flow — You have edit access
                </div>
            )}

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
                    disabled={isReadOnly}
                />

                <div style={{ flex: 1 }} />
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
