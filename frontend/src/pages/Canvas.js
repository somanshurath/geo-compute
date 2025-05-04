import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { fnIsTree } from '../algorithms/tree-detection';
import { fruchtermanReingold } from '../algorithms/fruchtermanReingold';

function Canvas() {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const [mode, setMode] = useState(() => {
        const savedMode = localStorage.getItem('mode');
        return savedMode !== null ? parseInt(savedMode, 10) : 0; // 1: add node, 2: add edge, 0: none, 4: graph layout algorithms
    });
    const [measure, setMeasure] = useState(0); // 0: none, 1: measure distance, 2: measure angle

    const [selectedAlgorithm, setSelectedAlgorithm] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);

    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedEdge, setSelectedEdge] = useState(null);

    const [isTree, setIsTree] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const [toggleView, setToggleView] = useState(true);

    let saveCount = 1;

    const navigate = useNavigate();

    const customAlertRef = useRef(null);
    const customAlertTextRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('mode', mode);
        if (mode !== 3) {
            setMeasure(null);
            setSelectedEdge(null);
        }
    }, [mode]);

    const alert = (message, type = 'normal', time = 3) => {
        if (!customAlertRef.current) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'custom-alert';
            alertDiv.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 15px 20px;
                border-radius: 5px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s;
                font-size: 16px;
                max-width: 80%;
                text-align: center;
            `;
            if (type === 'normal') {
                alertDiv.style.cssText += `
                    background-color: #282c34;
                    color: #61dafb;
                    border: 1px solid #61dafb;
                `;
            }
            else if (type === 'success') {
                alertDiv.style.cssText += `
                background-color: #282c34;
                color: #32CD32;
                border: 1px solid #32CD32;
                `;
            } else if (type === 'error') {
                alertDiv.style.cssText += `
                    background-color: #282c34;
                    color: #FF0000;
                    border: 1px solid #FF0000;
                `;
            }
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
        }, time * 1000);
    };

    const saveData = (nodes, edges, format = ".graphml") => {
        if (nodes.length === 0 && edges.length === 0) {
            alert("No data to save. Please add nodes or edges first.");
            return;
        }
        if (format === ".json") {
            const data = { nodes, edges };
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `graph_${saveCount}.json`;
            saveCount++;
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === ".graphml") {
            const xmlDoc = document.implementation.createDocument(null, "graphml");
            const graphml = xmlDoc.documentElement;
            const graph = xmlDoc.createElement("graph");
            graph.setAttribute("id", "G");
            graph.setAttribute("edgedefault", "undirected");

            nodes.forEach((node, index) => {
                const nodeElement = xmlDoc.createElement("node");
                nodeElement.setAttribute("id", `n${index}`);
                const xData = xmlDoc.createElement("data");
                xData.setAttribute("key", "x");
                xData.textContent = node[0];
                const yData = xmlDoc.createElement("data");
                yData.setAttribute("key", "y");
                yData.textContent = node[1];
                nodeElement.appendChild(xData);
                nodeElement.appendChild(yData);
                graph.appendChild(nodeElement);
            });

            edges.forEach((neighbors, sourceIndex) => {
                neighbors.forEach((targetIndex) => {
                    if (sourceIndex < targetIndex) {
                        const edgeElement = xmlDoc.createElement("edge");
                        edgeElement.setAttribute("source", `n${sourceIndex}`);
                        edgeElement.setAttribute("target", `n${targetIndex}`);
                        graph.appendChild(edgeElement);
                    }
                });
            });

            graphml.appendChild(graph);
            const serializer = new XMLSerializer();
            const graphmlString = serializer.serializeToString(xmlDoc);
            const blob = new Blob([graphmlString], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `graph_${saveCount}.graphml`;
            saveCount++;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            alert("Unsupported format. Please use .json or .graphml.");
        }
    };

    const loadData = (file) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                // keeping json since made app for it initially
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(event.target.result);
                    setNodes(data.nodes || []);
                    setEdges(data.edges || []);
                } else if (file.name.endsWith('.graphml')) {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(event.target.result, "application/xml");
                    const graphElement = xmlDoc.querySelector("graph");

                    if (!graphElement) {
                        throw new Error("Invalid GraphML file: Missing <graph> element.");
                    }

                    const newNodes = [];
                    const newEdges = [];

                    graphElement.querySelectorAll("node").forEach((node) => {
                        // const id = node.getAttribute("id");
                        let x = parseFloat(node.querySelector("data[key='x']")?.textContent);
                        let y = parseFloat(node.querySelector("data[key='y']")?.textContent);
                        if (!isNaN(x) && !isNaN(y)) {
                            newNodes.push([x, y, 0]);
                        }
                        else {
                            x = Math.random() * 10 - 5;
                            y = Math.random() * 10 - 5;
                            newNodes.push([x, y, 0]);
                        }
                    });

                    graphElement.querySelectorAll("edge").forEach((edge) => {
                        const source = edge.getAttribute("source");
                        const target = edge.getAttribute("target");
                        const sourceIndex = newNodes.findIndex((_, index) => `n${index}` === source);
                        const targetIndex = newNodes.findIndex((_, index) => `n${index}` === target);

                        if (sourceIndex !== -1 && targetIndex !== -1) {
                            if (!newEdges[sourceIndex]) newEdges[sourceIndex] = [];
                            if (!newEdges[targetIndex]) newEdges[targetIndex] = [];
                            newEdges[sourceIndex].push(targetIndex);
                            newEdges[targetIndex].push(sourceIndex);
                        }
                    });

                    setNodes(newNodes);
                    setEdges(newEdges);
                } else {
                    alert("Unsupported file format. Please upload a JSON or GraphML file.");
                }
            } catch (error) {
                console.error("Failed to load graph data:", error);
                alert("Invalid file. Please upload a valid graph file.");
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

        const gridHelper = new THREE.GridHelper(1000, 1000, 0x888888);
        gridHelper.rotation.x = Math.PI / 2;
        sceneRef.current.add(gridHelper);
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

    const findNearestLine = (x, y) => {
        if (nodes.length === 0) return null;

        let nearestLineStart = null;
        let nearestLineEnd = null;
        let minDistance = 1;
        edges.forEach((neighbors, index) => {
            neighbors.forEach((neighbor) => {
                const start = nodes[index];
                const end = nodes[neighbor];
                const lineVector = [end[0] - start[0], end[1] - start[1]];
                const lineLength = Math.sqrt(lineVector[0] ** 2 + lineVector[1] ** 2);
                const lineUnitVector = [lineVector[0] / lineLength, lineVector[1] / lineLength];
                const pointToStart = [x - start[0], y - start[1]];
                const projectionLength = pointToStart[0] * lineUnitVector[0] + pointToStart[1] * lineUnitVector[1];
                const closestPoint = [
                    start[0] + projectionLength * lineUnitVector[0],
                    start[1] + projectionLength * lineUnitVector[1],
                    0
                ];
                const distance = Math.sqrt((closestPoint[0] - x) ** 2 + (closestPoint[1] - y) ** 2);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestLineStart = index;
                    nearestLineEnd = neighbor;
                }
            });
        });

        if (nearestLineStart !== null && nearestLineEnd !== null) {
            const start = nodes[nearestLineStart];
            const end = nodes[nearestLineEnd];
            const distance = Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2);
            alert(`Distance between Node ${nearestLineStart} and Node ${nearestLineEnd}: ${distance.toFixed(2)}`, 'success', 5);
            setSelectedEdge([nearestLineStart, nearestLineEnd]);
        }
    };

    const handleCanvasClick = React.useCallback((event) => {
        if (!sceneRef.current || !cameraRef.current) return null;

        const rect = mountRef.current.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const aspectRatio = window.innerWidth / window.innerHeight;
        let worldX = x * aspectRatio * 5;
        let worldY = y * 5;

        const camera = cameraRef.current;
        const cameraX = camera.position.x;
        const cameraY = camera.position.y;
        const zoom = camera.zoom;
        worldX = (worldX - cameraX) / zoom;
        worldY = (worldY - cameraY) / zoom;

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
        } else if (mode === 3 && measure === 1) {
            findNearestLine(worldX, worldY);
        } else if (mode === 3 && measure === 2) {
            const nearestNode = findNearestNode(worldX, worldY);
            if (nearestNode !== null) {
                if (selectedNode === null) {
                    setSelectedNode([nearestNode]);
                    alert(`Selected Node ${nearestNode} as the first point for angle measurement.`, 'normal', 5);
                } else if (selectedNode.length === 1) {
                    setSelectedNode((prev) => [...prev, nearestNode]);
                    alert(`Selected Node ${nearestNode} as the vertex for angle measurement.`, 'normal', 5);
                } else if (selectedNode.length === 2) {
                    const [nodeAIndex, nodeBIndex] = selectedNode;
                    const nodeCIndex = nearestNode;

                    const nodeA = nodes[nodeAIndex];
                    const nodeB = nodes[nodeBIndex];
                    const nodeC = nodes[nodeCIndex];

                    const vectorAB = [nodeA[0] - nodeB[0], nodeA[1] - nodeB[1]];
                    const vectorCB = [nodeC[0] - nodeB[0], nodeC[1] - nodeB[1]];

                    const dotProduct = vectorAB[0] * vectorCB[0] + vectorAB[1] * vectorCB[1];
                    const magnitudeAB = Math.sqrt(vectorAB[0] ** 2 + vectorAB[1] ** 2);
                    const magnitudeCB = Math.sqrt(vectorCB[0] ** 2 + vectorCB[1] ** 2);

                    const angle = Math.acos(dotProduct / (magnitudeAB * magnitudeCB)) * (180 / Math.PI);

                    alert(`Angle at Node ${nodeBIndex} formed by Node ${nodeAIndex} and Node ${nodeCIndex}: ${angle.toFixed(2)}°`, 'success', 5);
                    setSelectedNode(null);
                }
            }
        } else if (mode === 4 && selectedAlgorithm === 5) {
            const nearestNode = findNearestNode(worldX, worldY);
            if (nearestNode !== null && nearestNode !== selectedNode) {
                setSelectedNode(nearestNode);
                alert(`Root node for radial layout set to node ${nearestNode}`);
            }
        }
    }, [mode, measure, selectedNode, nodes, selectedAlgorithm]);

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

        const gridHelper = new THREE.GridHelper(1000, 1000, 0x888888);
        gridHelper.rotation.x = Math.PI / 2;
        scene.add(gridHelper);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableRotate = false;
        controls.enableZoom = true;
        controls.screenSpacePanning = true;

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
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
                    const isSelectedEdge = selectedEdge &&
                        ((selectedEdge[0] === index && selectedEdge[1] === neighbor) ||
                            (selectedEdge[1] === index && selectedEdge[0] === neighbor));
                    const edgeMaterial = new THREE.LineBasicMaterial({
                        color: isSelectedEdge ? 0xffa500 : 0x61dafb,
                        linewidth: isSelectedEdge ? 2 : 1
                    });
                    const edgeLine = new THREE.Line(edgeGeometry, edgeMaterial);
                    sceneRef.current.add(edgeLine);
                });
            });

            if (rendererRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        }
    }, [edges, nodes, mode, selectedEdge]);

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

    const recalibrateGraph = (nodes, calib = true) => {
        if (calib) {
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
            const scale = Math.min(xScale, yScale);

            const newNodes = nodes.map
                (node => [(node[0] + xOffset) * scale, (node[1] + yOffset) * scale, node[2]]);
            clearScene(false);
            setNodes(newNodes);
        }
        else {
            clearScene(false);
            setNodes(nodes);
        }
    }

    const reingoldTilford = () => {
        // Implement Reingold-Tilford algorithm here
        // This is a placeholder function for the Reingold-Tilford algorithm
        alert("Reingold-Tilford algorithm is not implemented yet.");
    }

    const postorder = (nodes, edges, subtreeSizes, depths, root) => {
        const visited = new Array(nodes.length).fill(false);

        const dfs = (node, dep) => {
            visited[node] = true;
            subtreeSizes[node] = 1;
            depths[node] = dep;

            for (const child of edges[node]) {
                if (!visited[child]) {
                    dfs(child, dep + 1);
                    subtreeSizes[node] += subtreeSizes[child];
                }
            }
        };

        dfs(root, 0);
    };

    const preorder = (nodes, edges, subtreeSizes, depths, node, amin, amax, dist, angle, radiusStep) => {
        dist[node] = depths[node] * radiusStep;
        angle[node] = (amax + amin) / 2;

        if (depths[node] > 0) {
            amin = Math.max(amin, angle[node] - Math.acos(dist[node] / (dist[node] + radiusStep)));
            amax = Math.min(amax, angle[node] + Math.acos(dist[node] / (dist[node] + radiusStep)));
        }

        const angleStep = (amax - amin) / (subtreeSizes[node] - 1);

        let left = amin;
        for (const child of edges[node]) {
            if (dist[child] === -1) {
                let right = left + angleStep * subtreeSizes[child];
                preorder(nodes, edges, subtreeSizes, depths, child, left, right, dist, angle, radiusStep);
                left = right;
            }
        }
    };


    function polarToCartesian(radius, angle) {
        return [radius * Math.cos(angle), radius * Math.sin(angle), 0];
    };

    function convertToCartesian(distance, angle) {
        const newPositions = new Array(distance.length).fill(0).map(() => [0, 0, 0]);
        for (let i = 0; i < distance.length; i++) {
            const [x, y] = polarToCartesian(distance[i], angle[i]);
            newPositions[i] = [x, y, 0];
        }
        return newPositions;
    };

    function radialTreeLayout(nodes, edges, root = 1, radiusStep = 2) {
        const N = nodes.length;
        const subtreeSizes = new Array(N).fill(0);
        let depths = new Array(N).fill(0);
        postorder(nodes, edges, subtreeSizes, depths, root);

        const distance = new Array(N).fill(-1);
        const angle = new Array(N).fill(0);
        preorder(nodes, edges, subtreeSizes, depths, root, -Math.PI, Math.PI, distance, angle, radiusStep);

        return convertToCartesian(distance, angle);
    }

    const radial = () => {
        recalibrateGraph(radialTreeLayout(nodes, edges, selectedNode || 0));
    }

    useEffect(() => {
        const savedGraph = localStorage.getItem('graphData');
        if (savedGraph) {
            const { nodes: savedNodes, edges: savedEdges } = JSON.parse(savedGraph);
            setNodes(savedNodes || []);
            setEdges(savedEdges || []);
        }
    }, []);

    const saveGraphToLocalStorage = (nodes, edges) => {
        const graphData = { nodes, edges };
        localStorage.setItem('graphData', JSON.stringify(graphData));
    };

    useEffect(() => {
        saveGraphToLocalStorage(nodes, edges);
    }, [nodes, edges]);

    const detectLayoutChangeAndReload = React.useCallback(() => {
        let initialWidth = window.innerWidth;
        let initialHeight = window.innerHeight;

        const handleResize = () => {
            if (window.innerWidth !== initialWidth || window.innerHeight !== initialHeight) {
                saveGraphToLocalStorage(nodes, edges);
                window.location.reload();
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [nodes, edges]);

    useEffect(() => {
        const cleanup = detectLayoutChangeAndReload();
        return cleanup;
    }, [nodes, edges, detectLayoutChangeAndReload]);

    const checkTree = React.useCallback(async () => {
        setIsProcessing(true);
        const adjList = {};
        nodes.forEach((node, index) => {
            adjList[index] = edges[index];
        });

        const vertexCount = nodes.length;
        const edgeCount = edges.reduce((sum, neighbors) => sum + neighbors.length, 0) / 2;

        console.log("computing again");
        const isTreeResult = await fnIsTree(adjList, vertexCount, edgeCount);

        setIsTree(isTreeResult);
        setIsProcessing(false);
    }, [nodes, edges]);

    useEffect(() => {
        if (mode === 4) {
            checkTree();
        }
    }, [mode, checkTree]);

    return (
        <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
            <div ref={mountRef} />

            {toggleView && (
                <>
                    <div className="canvas-header">
                        <div className='canvas-header-content'>
                            <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                                <img src="/heptagon.png" alt="Logo" className="logo"
                                    style={{ width: '30px', verticalAlign: 'middle', marginRight: '10px', paddingBottom: '10px' }} />
                                Geo-Compute
                            </h1>

                            {mode < 4 && (
                                <>
                                    <h2>Graph Editor</h2>
                                    <p>Construct a graph by adding nodes and edges.</p>
                                    <div className="mode-buttons">
                                        <button
                                            className={mode === 1 ? 'selected btn no-hover' : 'btn'}
                                            onClick={() => {
                                                setMode((prevMode) => (prevMode !== 1 ? 1 : 0));
                                                setSelectedNode(null);
                                            }}
                                        >
                                            Add Node
                                        </button>
                                        <button
                                            className={mode === 2 ? 'selected btn no-hover' : 'btn'}
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

                                    <button onClick={() => {
                                        // const format = prompt("Enter the format to save the graph (.json or .graphml):", ".graphml");
                                        // if (format === ".json" || format === ".graphml") {
                                        //     saveData(nodes, edges, format);
                                        // } else {
                                        //     alert("Invalid format. Please enter .json or .graphml.");
                                        // }
                                        saveData(nodes, edges, ".graphml");
                                    }} className="sec-btn-success">
                                        Save Graph
                                    </button>
                                    <button onClick={() => clearScene(true)} className="sec-btn-grey">
                                        Clear Graph
                                    </button>
                                    <div>
                                        <input
                                            type="file"
                                            accept=".json, .graphml"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    clearScene(true);
                                                    loadData(file);
                                                }
                                            }}
                                        />
                                    </div>
                                    {nodes.length > 0 && (<div>
                                        <button
                                            onClick={() => {
                                                if (!nodes.length && !edges.length) {
                                                    alert("Please add a graph first.");
                                                    return;
                                                }
                                                setIsProcessing(true);
                                                checkTree();
                                                setMode(4)
                                            }}
                                            className="btn"
                                        >
                                            Graph Layout Algorithms
                                        </button>
                                    </div>)}
                                </>)}
                            {mode === 4 && (
                                <>
                                    <button className="sec-btn-grey"
                                        onClick={() => {
                                            setMode(0);
                                            setSelectedAlgorithm(null);
                                        }}>
                                        Back
                                    </button>
                                    <div className='algo-section'>
                                        <h2>Graph Layout Algorithms</h2>
                                        <p>Choose an algorithm to apply to the graph.</p>
                                        <button
                                            className={selectedAlgorithm === 1 ? 'selected btn no-hover' : 'btn-outline'}
                                            onClick={() => {
                                                setSelectedAlgorithm(1);
                                            }}
                                        >
                                            Fruchterman-Reingold
                                        </button>
                                        <div className="iterations-container">
                                            <label htmlFor="iterationsA">Number of Iterations</label>
                                            <input
                                                type="number"
                                                id="iterationsA"
                                                min="1"
                                                max="2000"
                                                defaultValue="100"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                const iterationsInput = document.querySelector("#iterationsA");
                                                const iterations = iterationsInput ? parseInt(iterationsInput.value, 10) : 0;

                                                if (selectedAlgorithm === 1) {
                                                    recalibrateGraph(fruchtermanReingold(iterations, nodes, edges));
                                                    alert("Fruchterman-Reingold algorithm applied to the graph.", 'success');
                                                } else {
                                                    alert("Choose an algorithm to apply to the graph.");
                                                }
                                            }}
                                            className="btn no-hover"
                                            style={{ marginTop: '0px' }}
                                        >
                                            Run
                                        </button>
                                    </div>
                                    {!isProcessing && isTree && (<>
                                        <div className='algo-section'>
                                            <h2>Tree Layout Algorithms</h2>
                                            <h3 style={{ color: '#32CD32' }}>(Graph is a tree)</h3>
                                            <button
                                                className={selectedAlgorithm === 5 ? 'selected btn no-hover' : 'btn-outline'}
                                                onClick={() => {
                                                    setSelectedAlgorithm(5);
                                                }}
                                            >
                                                Radial
                                            </button>
                                            <button
                                                className="btn no-hover"
                                                onClick={() => {
                                                    if (selectedAlgorithm === 5) {
                                                        radial();
                                                        alert("Radial algorithm applied to the graph.", 'success');
                                                    } else {
                                                        alert("Choose an algorithm to apply to the graph.");
                                                    }
                                                }}>
                                                Run
                                            </button>
                                            {selectedAlgorithm === 5 && (<>
                                                <p>You can select the root node for the radial layout.</p>
                                            </>)}
                                        </div>
                                    </>)}
                                    {isProcessing && (<>
                                        <div className='algo-section'>
                                            <h2>Processing...</h2>
                                            <p>Please wait while we check if the graph is a tree.</p>
                                        </div>
                                    </>
                                    )}
                                    {!isProcessing && !isTree && (<>
                                        <div className='algo-section'>
                                            <h2>Tree Layout Algorithms</h2>
                                            <h3 style={{ color: '#FF0000' }}>(Graph is not a tree)</h3>
                                            <p>Tree layout algorithms are not applicable to non-tree graphs.</p>
                                        </div>
                                    </>
                                    )}

                                </>)}
                        </div>

                        <button
                            className="toggle-view"
                            onClick={() => {
                                setToggleView(!toggleView);
                            }}
                        >
                            Hide Header
                        </button>
                    </div>
                </>
            )}

            {!toggleView && (
                <button
                    className="toggle-view show"
                    onClick={() => {
                        setToggleView(!toggleView);
                    }}
                >
                    Show Header
                </button>
            )}

            <div className="measure">
                <p>Measure Mode</p>
                <button
                    className={mode === 3 && measure === 1 ? 'selected btn' : 'btn-outline'}
                    onClick={() => {
                        setMeasure((prevMeasure) => (prevMeasure === 1 ? 0 : 1));
                        setMode((prevMeasure) => (prevMeasure === 1 ? 0 : 3));
                        setSelectedNode(null);
                    }}
                >
                    Distance
                </button>
                <button
                    className={mode === 3 && measure === 2 ? 'selected btn' : 'btn-outline'}
                    onClick={() => {
                        setMeasure((prevMeasure) => (prevMeasure === 2 ? 0 : 2));
                        setMode((prevMeasure) => (prevMeasure === 2 ? 0 : 3));
                        setSelectedNode(null);
                    }}
                >
                    Angle
                </button>
            </div>

            <div className="load-example">
                <label htmlFor="example-select">Load </label>
                <select
                    id="example-select"
                    onChange={(e) => {
                        const selectedGraph = e.target.value;
                        if (selectedGraph) {
                            fetch(`/examples/${selectedGraph}.graphml`)
                                .then((response) => response.blob())
                                .then((blob) => {
                                    const file = new File([blob], `${selectedGraph}.graphml`, { type: 'application/xml' });
                                    clearScene(true);
                                    loadData(file);
                                })
                                .catch((error) => {
                                    console.error('Error loading example data: ', error);
                                });
                        }
                        e.target.value = "";
                    }}
                >
                    <option value="">Select</option>
                    <option value="graph_1">Graph 1</option>
                    <option value="graph_2">Graph 2</option>
                    <option value="graph_3">Graph 3</option>
                    <option value="graph_4">Graph 4</option>
                    <option value="graph_5">Graph 5</option>
                </select>
            </div>
        </div >
    );
}

export default Canvas;
