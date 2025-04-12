import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

function Canvas() {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const [mode, setMode] = useState(0); // 1: add node, 2: add edge, 0: none, 4: graph layout algorithms
    const [selectedAlgorithm, setSelectedAlgorithm] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    let saveCount = 1;

    const navigate = useNavigate();

    const customAlertRef = useRef(null);
    const customAlertTextRef = useRef(null);

    const alert = (message) => {
        if (!customAlertRef.current) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'custom-alert';
            alertDiv.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #282c34;
                color: #61dafb;
                padding: 15px 20px;
                border-radius: 5px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s;
                font-size: 16px;
                max-width: 80%;
                text-align: center;
                border: 1px solid #61dafb;
            `;
            const textSpan = document.createElement('span');
            document.body.appendChild(alertDiv);
            alertDiv.appendChild(textSpan);
            customAlertRef.current = alertDiv;
            customAlertTextRef.current = textSpan;
        }

        customAlertTextRef.current.textContent = message;
        customAlertRef.current.style.opacity = '1';

        setTimeout(() => {
            if (customAlertRef.current) {
                customAlertRef.current.style.opacity = '0';
            }
        }, 3000);
    };

    const saveData = (nodes, edges) => {
        if (nodes.length === 0 && edges.length === 0) {
            alert("No data to save. Please add nodes or edges first.");
            return;
        }
        const data = { nodes, edges };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `graph_${saveCount}.json`;
        saveCount++;
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

    const clearScene = (rem_edge) => {
        setNodes([]);
        if (rem_edge) {
            setEdges([]);
        }
        sceneRef.current.clear();
        const gridHelper = new THREE.GridHelper(20, 20);
        gridHelper.rotation.x = Math.PI / 2;
        sceneRef.current.add(gridHelper);
    };

    const handleCanvasClick = React.useCallback((event) => {
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

        const rect = mountRef.current.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const aspectRatio = window.innerWidth / window.innerHeight;
        const worldX = x * aspectRatio * 5;
        const worldY = y * 5;

        if (mode === 1) {
            setNodes((prevNodes) => [...prevNodes, [worldX, worldY, 0]]);
            setEdges((prevEdges) => [...prevEdges, []]);
        } else if (mode === 2) {
            const nearestNode = findNearestNode(worldX, worldY);
            if (nearestNode !== null) {
                if (selectedNode === null) {
                    setSelectedNode(nearestNode);
                } else if (selectedNode !== nearestNode) {
                    setEdges((prevEdges) => {
                        const newEdges = [...prevEdges];
                        if (!newEdges[selectedNode].includes(nearestNode)) {
                            newEdges[selectedNode].push(nearestNode);
                        }
                        if (!newEdges[nearestNode].includes(selectedNode)) {
                            newEdges[nearestNode].push(selectedNode);
                        }
                        return newEdges;
                    });
                    setSelectedNode(null);
                }
            }
        }
    }, [mode, selectedNode, nodes]);

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
            const nodeGeometry = new THREE.CircleGeometry(0.1, 32);

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
            edges.forEach((neighbors, index) => {
                neighbors.forEach((neighbor) => {
                    const start = nodes[index];
                    const end = nodes[neighbor];
                    const edgeGeometry = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(start[0], start[1], start[2]),
                        new THREE.Vector3(end[0], end[1], end[2])
                    ]);
                    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x61dafb });
                    const edgeLine = new THREE.Line(edgeGeometry, edgeMaterial);
                    sceneRef.current.add(edgeLine);
                });
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
    }, [mode, nodes, edges, selectedNode, handleCanvasClick]);

    const recalibrateGraph = (nodes) => {
        if (nodes.length === 0) return;
        const xMin = Math.min(...nodes.map(node => node[0]));
        const xMax = Math.max(...nodes.map(node => node[0]));
        const yMin = Math.min(...nodes.map(node => node[1]));
        const yMax = Math.max(...nodes.map(node => node[1]));
        const xCenter = (xMin + xMax) / 2;
        const yCenter = (yMin + yMax) / 2;
        const xOffset = -xCenter;
        const yOffset = -yCenter;
        const xScale = 8 / (xMax - xMin);
        const yScale = 8 / (yMax - yMin);

        const newNodes = nodes.map
            (node => [(node[0] + xOffset) * xScale, (node[1] + yOffset) * yScale, node[2]]);
        clearScene(false);
        setNodes(newNodes);
    }

    const fruchtermanReingold = (iterations) => {
        const k = 2; // ?
        const temperature = 5.0; // ?

        let positions = nodes.map(node => [...node]);

        for (let iter = 0; iter < iterations; iter++) {
            const coolingFactor = temperature * Math.pow(1.0 - iter / iterations, 2); // ?
            let displacements = Array(nodes.length).fill().map(() => [0, 0, 0]);

            for (let i = 0; i < nodes.length; i++) {
                for (let j = 0; j < nodes.length; j++) {
                    if (i !== j) {
                        const dx = positions[i][0] - positions[j][0];
                        const dy = positions[i][1] - positions[j][1];
                        const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;

                        const repulsiveForce = k * k / distance;

                        displacements[i][0] += (dx / distance) * repulsiveForce;
                        displacements[i][1] += (dy / distance) * repulsiveForce;
                    }
                }
            }

            for (let i = 0; i < edges.length; i++) {
                for (let j = 0; j < edges[i].length; j++) {
                    const neighbor = edges[i][j];

                    if (i < neighbor) {
                        const dx = positions[i][0] - positions[neighbor][0];
                        const dy = positions[i][1] - positions[neighbor][1];
                        const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;

                        const attractiveForce = distance * distance / k;

                        displacements[i][0] -= (dx / distance) * attractiveForce;
                        displacements[i][1] -= (dy / distance) * attractiveForce;
                        displacements[neighbor][0] += (dx / distance) * attractiveForce;
                        displacements[neighbor][1] += (dy / distance) * attractiveForce;
                    }
                }
            }

            for (let i = 0; i < nodes.length; i++) {
                const dx = displacements[i][0];
                const dy = displacements[i][1];
                const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;

                const limitedDistance = Math.min(distance, coolingFactor);

                positions[i][0] += (dx / distance) * limitedDistance;
                positions[i][1] += (dy / distance) * limitedDistance;
                positions[i][2] = 0;
            }
        }
        recalibrateGraph(positions);
    };

    return (
        <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
            <div ref={mountRef} />

            <div className="canvas-header">
                <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <img src="/heptagon.png" alt="Logo" className="logo"
                        style={{ width: '30px', verticalAlign: 'middle', marginRight: '10px', paddingBottom: '10px' }} />
                    Geo-Compute
                </h1>

                {mode < 4 && (<>
                    <p>Graph Visualization Tool</p>
                    <div className="mode-buttons">
                        <button
                            className={mode === 1 ? 'selected btn' : 'btn'}
                            onClick={() => {
                                setMode((prevMode) => (prevMode !== 1 ? 1 : 0));
                                setSelectedNode(null);
                            }}
                        >
                            Add Node
                        </button>
                        <button
                            className={mode === 2 ? 'selected btn' : 'btn'}
                            onClick={() => {
                                if (nodes.length < 2) {
                                    alert("Please add 2 nodes first.");
                                    return;
                                }
                                setMode((prevMode) => (prevMode !== 2 ? 2 : 0));
                                setSelectedNode(null);
                            }}
                        >
                            Add Edge
                        </button>
                    </div>

                    <p>Nodes: {nodes.length}</p>
                    <p>Edges: {edges.reduce((sum, neighbors) => sum + neighbors.length, 0) / 2}</p>

                    <button onClick={() => saveData(nodes, edges)} className="sec-btn-success">
                        Save Graph
                    </button>
                    <button onClick={() => clearScene(true)} className="sec-btn-grey">
                        Clear Graph
                    </button>
                    <input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                clearScene(true);
                                loadData(file);
                            }
                        }}
                    />
                    {nodes.length > 0 && (<>
                        <button
                            onClick={() => {
                                if (!nodes.length && !edges.length) {
                                    alert("Please add a graph first.");
                                    return;
                                }
                                setMode(4)
                            }}
                            className="btn"
                        >
                            Graph Layout Algorithms
                        </button>
                    </>)}
                </>)}
                {mode === 4 && (<>
                    <button className="sec-btn-grey"
                        onClick={() => {
                            setMode(0);
                            setSelectedAlgorithm(null);
                        }}>
                        Back
                    </button>
                    <h2>Graph Layout Algorithms</h2>
                    <p>Choose an algorithm to apply to the graph.</p>
                    <div className='algo-section'>
                        <button
                            className={selectedAlgorithm === 1 ? 'selected btn' : 'btn'}
                            onClick={() => {
                                setSelectedAlgorithm(1);
                            }}
                        >
                            Fruchterman-Reingold
                        </button>
                        <button
                            className={selectedAlgorithm === 2 ? 'selected btn' : 'btn'}
                            onClick={() => {
                                setSelectedAlgorithm(2);
                            }}
                            disabled={true}
                        >
                            Eades
                        </button>
                        <button
                            className={selectedAlgorithm === 3 ? 'selected btn' : 'btn'}
                            onClick={() => {
                                setSelectedAlgorithm(3);
                            }}
                            disabled={true}
                        >
                            Tutte
                        </button>
                    </div>
                    <div className='algo-section'>
                        <label htmlFor="iterations">Run for Iterations: </label>
                        <input
                            type="number"
                            id="iterations"
                            min="1"
                            max="2000"
                            defaultValue="100"
                        />
                        <button
                            onClick={() => {
                                const iterations = parseInt(document.getElementById("iterations").value, 10);

                                if (selectedAlgorithm === 1) {
                                    fruchtermanReingold(iterations);
                                } else if (selectedAlgorithm === 2) {
                                    // Call Eades algorithm
                                } else if (selectedAlgorithm === 3) {
                                    // Call Tutte algorithm
                                } else {
                                    alert("Please select an algorithm first.");
                                }
                            }}
                            className="btn"
                        >
                            Run
                        </button>
                    </div>

                </>)}
            </div>
        </div >
    );
}

export default Canvas;
