import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

function Canvas() {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const [mode, setMode] = useState(0); // 1: add node, 2: add edge, 0: none
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    var saveCount = 1;

    const saveData = (nodes, edges) => {
        const data = { nodes, edges };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `graph_${saveCount}.json`;
        saveCount += 1;
        a.click();
        URL.revokeObjectURL(url);
    };

    const loadData = (file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                setNodes(data.nodes || []);
                setEdges(data.edges || []);
            } catch (error) {
                console.error("Failed to load graph data:", error);
                alert("Invalid JSON file. Please upload a valid graph file.");
            }
        };
        reader.readAsText(file);
    };

    const clearScene = () => {
        setNodes([]);
        setEdges([]);
        setMode(0);
        sceneRef.current.clear();
        const gridHelper = new THREE.GridHelper(20, 20);
        gridHelper.rotation.x = Math.PI / 2;
        sceneRef.current.add(gridHelper);
    };

    const handleCanvasClick = (event) => {
        const rect = mountRef.current.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const aspectRatio = window.innerWidth / window.innerHeight;
        const worldX = x * aspectRatio * 5;
        const worldY = y * 5;

        if (mode === 1) {
            setNodes((prevNodes) => [...prevNodes, [worldX, worldY, 0]]);
        } else if (mode === 2) {
            const nearestNode = findNearestNode(worldX, worldY);
            if (nearestNode !== null) {
                if (selectedNode === null) {
                    setSelectedNode(nearestNode);
                } else if (selectedNode !== nearestNode) {
                    setEdges((prevEdges) => [...prevEdges, [selectedNode, nearestNode]]);
                    setSelectedNode(null);
                }
            }
        }
    };

    const findNearestNode = (x, y) => {
        if (nodes.length === 0) return null;

        let nearestNodeIndex = null;
        let minDistance = 0.2;

        nodes.forEach((node, index) => {
            const distance = Math.sqrt((node[0] - x) ** 2 + (node[1] - y) ** 2);
            if (distance < minDistance) {
                minDistance = distance;
                nearestNodeIndex = index;
            }
        });

        return nearestNodeIndex;
    };

    useEffect(() => {
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.background = new THREE.Color(0x282c34);

        const aspectRatio = window.innerWidth / window.innerHeight;
        const camera = new THREE.OrthographicCamera(
            -aspectRatio * 5,
            aspectRatio * 5,
            5,
            -5,
            0.1,
            1000
        );
        camera.position.z = 5;
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        rendererRef.current = renderer;

        if (mountRef.current && !mountRef.current.hasChildNodes()) {
            mountRef.current.appendChild(renderer.domElement);
        }

        const gridHelper = new THREE.GridHelper(20, 20);
        gridHelper.rotation.x = Math.PI / 2;
        scene.add(gridHelper);

        const animate = () => {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            renderer.dispose();
            if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    useEffect(() => {
        if (sceneRef.current) {
            const nodeGeometry = new THREE.CircleGeometry(0.2, 32);

            nodes.forEach((node, index) => {
                const isSelected = selectedNode === index;
                const nodeMaterial = new THREE.MeshBasicMaterial({
                    color: isSelected ? 0x258ccc : 0x61dafb, // Darker blue for selected node
                });

                const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
                nodeMesh.position.set(node[0], node[1], node[2]);
                sceneRef.current.add(nodeMesh);
            });

            if (rendererRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        }
    }, [nodes, selectedNode, mode]);

    useEffect(() => {
        if (sceneRef.current) {
            edges.forEach((edge) => {
                const start = nodes[edge[0]];
                const end = nodes[edge[1]];
                const edgeGeometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(start[0], start[1], start[2]),
                    new THREE.Vector3(end[0], end[1], end[2])
                ]);
                const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x61dafb });
                const edgeLine = new THREE.Line(edgeGeometry, edgeMaterial);
                sceneRef.current.add(edgeLine);
            });

            if (rendererRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        }
    }, [edges, nodes, mode]);

    useEffect(() => {
        if (mountRef.current) {
            mountRef.current.addEventListener('click', handleCanvasClick);
        }

        return () => {
            if (mountRef.current) {
                mountRef.current.removeEventListener('click', handleCanvasClick);
            }
        };
    }, [mode, nodes, edges, selectedNode]);

    return (
        <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
            <div ref={mountRef} />

            <div className="canvas-header">
                <h1>Geo-Compute</h1>
                <p>Click to add nodes or edges...</p>

                <h2>
                    Mode: {mode === 1 ? 'Add Node' : mode === 2 ? 'Add Edge' : 'None'}
                </h2>
                <div className="mode-buttons">
                    <button
                        className={mode === 1 ? 'selected' : ''}
                        onClick={() => {
                            setMode((prevMode) => (prevMode !== 1 ? 1 : 0));
                            setSelectedNode(null);
                        }}
                    >
                        Add Node
                    </button>
                    <button
                        className={mode === 2 ? 'selected' : ''}
                        onClick={() => {
                            setMode((prevMode) => (prevMode !== 2 ? 2 : 0));
                            setSelectedNode(null);
                        }}
                    >
                        Add Edge
                    </button>
                </div>

                <p>Nodes: {nodes.length}</p>
                <p>Edges: {edges.length}</p>

                <button onClick={() => saveData(nodes, edges)} className="btn">
                    Save Graph
                </button>
                <button onClick={() => clearScene()} className="btn">
                    Clear Graph
                </button>
                <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                            loadData(file);
                        }
                    }}
                />

                <div className='algo-section'>
                    <button
                        onClick={() => { }}
                        className="btn"
                    >
                        Change Layout (Fruchterman-Reingold)
                    </button>
                    <button
                        onClick={() => { }}
                        className="btn"
                    >
                        Change Layout (Eades)
                    </button>
                    <button
                        onClick={() => { }}
                        className="btn"
                    >
                        Change Layout (Tutte)
                    </button>
                </div>
            </div>
        </div >
    );
}

export default Canvas;
